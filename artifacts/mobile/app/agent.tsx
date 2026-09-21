import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useSubscriptions } from '@/context/SubscriptionContext';
import { useBills } from '@/context/BillsContext';
import { useLoans } from '@/context/LoanContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage, useRTL } from '@/context/LanguageContext';
import { PremiumGate } from '@/components/PremiumGate';
import MarkdownMessage from '@/components/MarkdownMessage';

// EXPO_PUBLIC_API_URL already includes the /api prefix (e.g. ".../api")
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

interface Message {
  id: string;
  role: 'agent' | 'user';
  text: string;
  ts: Date;
}

// API message shape for the conversation history sent to the server
interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ── Quick-action suggestion chips shown above input ───────────────────────
const SUGGESTIONS_EN = [
  'What should I cancel?',
  'How are my savings?',
  'Break down my budget',
  'Which bill is highest?',
];
const SUGGESTIONS_AR = [
  'ما الذي يجب إلغاؤه؟',
  'كيف مدخراتي؟',
  'تحليل ميزانيتي',
  'ما أغلى فاتورة؟',
];

export default function AgentScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { subscriptions, monthlyTotal } = useSubscriptions();
  const { bills, monthlyBillsTotal }    = useBills();
  const { loans, monthlyPayments: monthlyLoanPayments, totalDebt } = useLoans();
  const { user }                        = useAuth();
  const { t, fonts, isRTL }            = useLanguage();
  const rtl = useRTL();
  const { initialMessage } = useLocalSearchParams<{ initialMessage?: string }>();

  const [messages, setMessages] = useState<Message[]>([
    { id: 'm0', role: 'agent', text: t('agent_greeting'), ts: new Date() },
  ]);
  // Separate history for the API (only content strings, no display metadata)
  const [apiHistory, setApiHistory] = useState<ApiMessage[]>([]);
  const [input, setInput]     = useState('');
  const [streaming, setStreaming] = useState(false);
  const listRef = useRef<FlatList>(null);
  const suggestions = isRTL ? SUGGESTIONS_AR : SUGGESTIONS_EN;
  const didAutoSend = useRef(false);

  // Auto-send pre-filled message on mount (e.g. from "How to cancel" entry point)
  useEffect(() => {
    if (initialMessage && !didAutoSend.current) {
      didAutoSend.current = true;
      // Small delay so the greeting message is visible first
      setTimeout(() => sendText(initialMessage), 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage]);

  const buildContext = useCallback(() => ({
    income: user?.income,
    monthlySubTotal: monthlyTotal,
    monthlyBillTotal: monthlyBillsTotal,
    monthlyLoanPayments,
    totalDebt,
    language: (isRTL ? 'ar' : 'en') as 'en' | 'ar',
    subscriptions: subscriptions.map(s => ({
      name: s.name,
      amount: s.amount,
      status: s.status,
      category: s.category,
    })),
    bills: bills.map(b => ({
      name: b.name,
      amount: b.amount,
      dueDayOfMonth: b.dueDayOfMonth,
      category: b.category,
    })),
    loans: loans.map(l => ({
      name: l.name,
      lender: l.lender,
      type: l.type,
      currentBalance: l.currentBalance,
      nextPaymentAmount: l.nextPaymentAmount,
      interestRate: l.interestRate,
      minimumPayment: l.minimumPayment,
    })),
  }), [user, monthlyTotal, monthlyBillsTotal, monthlyLoanPayments, totalDebt, isRTL, subscriptions, bills, loans]);

  const sendText = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const userMsgId  = `m${Date.now()}`;
    const agentMsgId = `m${Date.now() + 1}`;

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', text: trimmed, ts: new Date() },
      { id: agentMsgId, role: 'agent', text: '', ts: new Date() },
    ]);
    setInput('');
    setStreaming(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

    const nextHistory: ApiMessage[] = [
      ...apiHistory,
      { role: 'user', content: trimmed },
    ];

    let fullContent = '';
    try {
      // EXPO_PUBLIC_API_URL already contains the /api prefix
      const res = await fetch(`${API_BASE}/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextHistory, context: buildContext() }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Expo Go native doesn't expose response.body as a ReadableStream —
      // read the full SSE body as text and parse it in one pass.
      // On web we could stream, but using text() everywhere keeps it simple
      // and avoids a platform split that's hard to test.
      const rawText = await res.text();
      const lines = rawText.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.content) {
            fullContent += data.content;
          }
          if (data.error) throw new Error(data.error);
        } catch (parseErr: any) {
          // JSON.parse throws SyntaxError on malformed input; our own
          // `throw new Error(data.error)` is a plain Error — re-throw it.
          // Checking instanceof SyntaxError works across all JS engines
          // (V8/Node, Hermes, JSC) unlike a message-prefix heuristic.
          if (!(parseErr instanceof SyntaxError)) throw parseErr;
          // skip malformed SSE line
        }
      }
      // Show complete response at once
      setMessages(prev =>
        prev.map(m => m.id === agentMsgId ? { ...m, text: fullContent } : m),
      );
    } catch (err: any) {
      const errMsg = isRTL
        ? 'عذراً، حدث خطأ أثناء الاتصال. حاول مرة أخرى.'
        : 'Sorry, something went wrong. Please try again.';
      fullContent = errMsg;
      setMessages(prev =>
        prev.map(m => m.id === agentMsgId ? { ...m, text: errMsg } : m),
      );
    } finally {
      setStreaming(false);
      if (fullContent) {
        setApiHistory([
          ...nextHistory,
          { role: 'assistant', content: fullContent },
        ]);
      }
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
    }
  }, [streaming, apiHistory, buildContext, isRTL]);

  const topPadding = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  return (
    <PremiumGate>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={['#1A0E3C', '#0A0E1A']}
          style={[styles.header, rtl.row(), { paddingTop: topPadding + 12 }]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { fontFamily: fonts.bold, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('agent_title')}
            </Text>
            <View style={[styles.headerSubRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.onlineDot} />
              <Text style={[styles.headerSub, { fontFamily: fonts.regular }]}>
                {t('agent_subtitle')}
              </Text>
            </View>
          </View>
          <LinearGradient colors={['#7B6CF8', '#A78BFA']} style={styles.agentAvatar}>
            <Feather name="cpu" size={18} color="#fff" />
          </LinearGradient>
        </LinearGradient>

        {/* ── Messages ── */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isAgent = item.role === 'agent';
            const isEmpty = isAgent && item.text === '' && streaming;
            return (
              <View style={[
                styles.bubble,
                isAgent
                  ? [styles.agentBubble, { backgroundColor: colors.card, borderColor: colors.border, alignSelf: isRTL ? 'flex-end' : 'flex-start' }]
                  : [styles.userBubble, { backgroundColor: colors.primary, alignSelf: isRTL ? 'flex-start' : 'flex-end' }],
              ]}>
                {isAgent && (
                  <LinearGradient colors={['#7B6CF8', '#A78BFA']} style={styles.agentDot}>
                    <Feather name="cpu" size={10} color="#fff" />
                  </LinearGradient>
                )}
                {isEmpty ? (
                  // Typing dots while waiting for first token
                  <View style={styles.typingRow}>
                    {[0, 1, 2].map(i => (
                      <View key={i} style={[styles.typingDot, { backgroundColor: colors.mutedForeground, opacity: 0.5 + i * 0.15 }]} />
                    ))}
                  </View>
                ) : isAgent ? (
                  <MarkdownMessage
                    text={item.text}
                    baseColor={colors.foreground}
                    accentColor={colors.primary}
                    fontRegular={fonts.regular}
                    fontBold={fonts.bold}
                    isRTL={isRTL}
                    fontSize={14}
                  />
                ) : (
                  <Text style={[
                    styles.bubbleText,
                    { fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left', color: '#fff' },
                  ]}>
                    {item.text}
                  </Text>
                )}
              </View>
            );
          }}
        />

        {/* ── Suggestion chips (only when not streaming and only a few messages shown) ── */}
        {!streaming && messages.length <= 3 && (
          <View style={[styles.chipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {suggestions.map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => sendText(s)}
                style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, { color: colors.primary, fontFamily: fonts.medium }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Input bar ── */}
        <View style={[
          styles.inputBar, rtl.row(),
          { backgroundColor: colors.card, borderColor: colors.border, marginBottom: insets.bottom + (Platform.OS === 'web' ? 84 : 8) },
        ]}>
          <TextInput
            style={[styles.inputText, { color: colors.foreground, fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={t('agent_input_placeholder')}
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendText(input)}
            returnKeyType="send"
            multiline
            editable={!streaming}
          />
          <TouchableOpacity onPress={() => sendText(input)} disabled={!input.trim() || streaming} activeOpacity={0.75}>
            <LinearGradient
              colors={(input.trim() && !streaming) ? ['#7B6CF8', '#9D8FF8'] : [colors.muted, colors.muted]}
              style={styles.sendBtn}
            >
              {streaming
                ? <ActivityIndicator size="small" color={colors.mutedForeground} />
                : <Feather name="send" size={16} color={input.trim() ? '#fff' : colors.mutedForeground} />
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </PremiumGate>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  header:        { paddingHorizontal: 16, paddingBottom: 16, gap: 12, alignItems: 'center' },
  backBtn:       { padding: 4 },
  headerTitle:   { color: '#fff', fontSize: 18 },
  headerSubRow:  { alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00D9A6' },
  headerSub:     { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  agentAvatar:   { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  messageList:   { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 12 },
  bubble:        { maxWidth: '82%', padding: 14, borderRadius: 16, gap: 6 },
  userBubble:    { borderBottomRightRadius: 4 },
  agentBubble:   { borderWidth: 1, borderBottomLeftRadius: 4, flexDirection: 'column', gap: 8 },
  agentDot:      { width: 22, height: 22, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  bubbleText:    { fontSize: 14, lineHeight: 21 },
  typingRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  typingDot:     { width: 7, height: 7, borderRadius: 4 },
  chipsRow:      { flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, paddingBottom: 8 },
  chip:          { paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  chipText:      { fontSize: 12 },
  inputBar:      { marginHorizontal: 12, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, gap: 8, alignItems: 'flex-end' },
  inputText:     { flex: 1, fontSize: 14, maxHeight: 100 },
  sendBtn:       { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
