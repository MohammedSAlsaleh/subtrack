import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

// ── Error sanitization ─────────────────────────────────────────────────────
// Maps SDK / network errors to safe user-facing strings.
// The raw error is always logged server-side for debugging.
export function sanitizeOpenAIError(err: unknown): string {
  if (err == null || typeof err !== "object") {
    return "Unknown error";
  }

  const e = err as Record<string, unknown>;
  const status = typeof e.status === "number" ? e.status : undefined;
  const code   = typeof e.code   === "string" ? e.code   : undefined;
  const msg    = typeof e.message === "string" ? e.message : undefined;

  // Auth failure (401 / invalid key)
  if (status === 401 || code === "invalid_api_key") {
    return "The AI advisor is temporarily unavailable. Please try again later.";
  }

  // Quota exceeded / rate limit
  if (
    status === 429 ||
    code === "insufficient_quota" ||
    (msg != null && /quota/i.test(msg)) ||
    (msg != null && /rate[\s-]?limit/i.test(msg))
  ) {
    return "The AI advisor has reached its quota limit. Please try again later.";
  }

  // Network / connection errors
  if (
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND"
  ) {
    return "The AI advisor is temporarily unavailable. Please try again later.";
  }

  // Any other Error with a message — return a generic safe string
  if (msg != null) {
    return "The AI advisor is temporarily unavailable. Please try again later.";
  }

  // Plain objects without a message (e.g. { code: "TIMEOUT" })
  return "Unknown error";
}

// ── POST /api/agent/chat ───────────────────────────────────────────────────
// Body: {
//   messages: { role: "user"|"assistant", content: string }[],
//   context: {
//     income?: number;
//     monthlySubTotal: number;
//     monthlyBillTotal: number;
//     language: "en" | "ar";
//     subscriptions: { name: string; amount: number; status: string; category: string }[];
//     bills: { name: string; amount: number; dueDayOfMonth: number; category: string }[];
//   }
// }
// Streams SSE: data: {"content":"..."}\n\n  …  data: {"done":true}\n\n
router.post("/agent/chat", async (req, res) => {
  const { messages = [], context } = req.body as {
      messages: { role: "user" | "assistant"; content: string }[];
      context: {
        income?: number;
        monthlySubTotal: number;
        monthlyBillTotal: number;
        monthlyLoanPayments: number;
        totalDebt: number;
        language: "en" | "ar";
        subscriptions: { name: string; amount: number; status: string; category: string }[];
        bills: { name: string; amount: number; dueDayOfMonth: number; category: string }[];
        loans: { name: string; lender: string; type: string; currentBalance: number; nextPaymentAmount: number; interestRate?: number; minimumPayment?: number }[];
      };
    };

    // ── Validate required numeric context fields ───────────────────────────
    const REQUIRED_NUMERIC = ["monthlySubTotal", "monthlyBillTotal", "monthlyLoanPayments"] as const;
    const missing = REQUIRED_NUMERIC.filter(
      (k) => typeof context?.[k] !== "number",
    );
    if (!context || missing.length > 0) {
      res.status(400).json({
        error: `Missing or non-numeric context field(s): ${missing.join(", ")}. Financial data must be attached before using the AI advisor.`,
      });
      return;
    }

    const isAr = context.language === "ar";
    const income = context.income ?? 0;
    const totalExpenses = context.monthlySubTotal + context.monthlyBillTotal + context.monthlyLoanPayments;
    const savings = Math.max(0, income - totalExpenses);
    const savingsPct = income > 0 ? ((savings / income) * 100).toFixed(1) : "0";

    const subsText = (context.subscriptions ?? [])
      .map(s => `  • ${s.name} — SAR ${s.amount}/mo (${s.status}, ${s.category})`)
      .join("\n") || "  None";

    const billsText = (context.bills ?? [])
      .map(b => `  • ${b.name} — SAR ${b.amount}/mo, due day ${b.dueDayOfMonth} (${b.category})`)
      .join("\n") || "  None";

    const loansText = (context.loans ?? [])
      .map(l => {
        const parts = [`  • ${l.name} (${l.lender}, ${l.type.replace("_", " ")})`,
          `balance SAR ${l.currentBalance.toLocaleString()}`,
          `next payment SAR ${l.nextPaymentAmount}`];
        if (l.interestRate) parts.push(`APR ${l.interestRate}%`);
        return parts.join(" — ");
      })
      .join("\n") || "  None";

    const systemPrompt = isAr
      ? `أنت مساعد ذكاء اصطناعي متخصص في الشؤون المالية الشخصية للمستخدمين في المملكة العربية السعودية. اسمك "SubTrack AI".
أجب دائماً باللغة العربية، بأسلوب واضح وودّي ومباشر.

── البيانات المالية الحالية للمستخدم ──
الدخل الشهري: ${income > 0 ? `SAR ${income.toLocaleString()}` : "غير محدد"}
إجمالي الاشتراكات: SAR ${context.monthlySubTotal.toFixed(2)}/شهر
إجمالي الفواتير الثابتة: SAR ${context.monthlyBillTotal.toFixed(2)}/شهر
أقساط القروض الشهرية: SAR ${context.monthlyLoanPayments.toFixed(2)}/شهر
إجمالي المصروفات: SAR ${totalExpenses.toFixed(2)}/شهر
المدّخرات المتاحة: SAR ${savings.toFixed(2)}/شهر (${savingsPct}%)
إجمالي الديون: SAR ${(context.totalDebt ?? 0).toLocaleString()}

الاشتراكات:
${subsText}

الفواتير الثابتة:
${billsText}

القروض والبطاقات الائتمانية والتقسيط:
${loansText}

── إرشادات ──
- استخدم أسماء الاشتراكات والفواتير الحقيقية في ردودك.
- قدّم توصيات محددة وقابلة للتنفيذ بناءً على البيانات أعلاه.
- إذا تجاوزت المصروفات الدخل، نبّه المستخدم فوراً.
- استهدف نسبة ادخار 20% كمعيار صحي.
- لا تتكرر؛ كل رد يجب أن يضيف قيمة جديدة.
- أجب بإيجاز وبشكل مركّز (3–5 جمل في المعتاد).`
      : `You are SubTrack AI, a personal finance assistant for users in Saudi Arabia.
Respond in English, in a clear, friendly, and direct tone.

── User's current financial snapshot ──
Monthly income: ${income > 0 ? `SAR ${income.toLocaleString()}` : "not set"}
Subscriptions total: SAR ${context.monthlySubTotal.toFixed(2)}/mo
Fixed bills total: SAR ${context.monthlyBillTotal.toFixed(2)}/mo
Loan/BNPL payments: SAR ${context.monthlyLoanPayments.toFixed(2)}/mo
Total expenses: SAR ${totalExpenses.toFixed(2)}/mo
Available to save: SAR ${savings.toFixed(2)}/mo (${savingsPct}%)
Total outstanding debt: SAR ${(context.totalDebt ?? 0).toLocaleString()}

Subscriptions:
${subsText}

Fixed bills:
${billsText}

Loans, credit cards & BNPL:
${loansText}

── Guidelines ──
- Reference actual subscription and bill names from the data above.
- Give specific, actionable advice grounded in the numbers shown.
- If expenses exceed income, flag it immediately.
- Treat 20% savings rate as the healthy benchmark.
- Never repeat yourself; every reply should add fresh value.
- Be concise and focused (3–5 sentences normally).
- You can do multi-turn conversation — remember what was said earlier in this chat.`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // ── Inactivity timeout ─────────────────────────────────────────────────
    // Abort the stream if no chunk arrives within INACTIVITY_TIMEOUT_MS.
    // The env var can be set to a small value in tests to exercise this path.
    const INACTIVITY_TIMEOUT_MS = Number(
      process.env.AGENT_INACTIVITY_TIMEOUT_MS ?? 30_000,
    );
    const abortController = new AbortController();
    let timedOut = false;
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        timedOut = true;
        abortController.abort();
      }, INACTIVITY_TIMEOUT_MS);
    };

    resetTimer(); // start the clock before the first chunk is expected

    try {
      const stream = await openai.chat.completions.create(
        {
          model: "gpt-5.6-luna",
          max_completion_tokens: 512,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        },
        { signal: abortController.signal },
      );

      for await (const chunk of stream) {
        resetTimer(); // got a chunk — reset the inactivity clock
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      clearTimeout(inactivityTimer!);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err: unknown) {
      clearTimeout(inactivityTimer!);
      console.error("Agent chat error:", err);
      const message = timedOut
        ? "Response timed out"
        : sanitizeOpenAIError(err);
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
});

export default router;
