const base = import.meta.env.BASE_URL;

export default function Slide10() {
  const prompts = [
    { text: 'Am I overspending on subscriptions?', color: 'bg-primary/10 text-primary' },
    { text: 'How long until my Hajj fund goal?', color: 'bg-accent/10 text-accent' },
    { text: 'Which loan should I pay off first?', color: 'bg-primary/10 text-primary' },
  ];

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-0 left-0 w-full h-[1vh] bg-primary" />
      <div className="absolute -top-[12vh] -right-[8vw] w-[28vw] h-[28vw] rounded-full bg-primary/5" />
      <div className="absolute -bottom-[16vh] -left-[6vw] w-[26vw] h-[26vw] rounded-full bg-accent/5" />

      <div className="relative h-full flex items-center px-[6vw] gap-[5vw]">
        {/* Left: phone mockup */}
        <div className="shrink-0">
          <div className="h-[80vh] aspect-[402/874] rounded-[2vw] border-[0.5vh] border-text/10 bg-[#0A0E1A] shadow-xl overflow-hidden flex flex-col">
            {/* Chat header */}
            <div className="px-[4%] pt-[5%] pb-[3%] border-b border-white/5">
              <div className="flex items-center gap-[3%]">
                <div className="w-[8%] aspect-square rounded-full bg-primary flex items-center justify-center shrink-0">
                  <span className="text-white font-bold" style={{ fontSize: '1.6vh' }}>AI</span>
                </div>
                <div>
                  <div className="text-white font-semibold" style={{ fontSize: '1.6vh' }}>Budget Agent</div>
                  <div className="text-white/40" style={{ fontSize: '1.2vh' }}>Knows your full financial picture</div>
                </div>
              </div>
            </div>
            {/* Chat messages */}
            <div className="flex-1 px-[4%] py-[4%] flex flex-col gap-[2.5%] overflow-hidden">
              <div className="self-end bg-primary/20 text-white rounded-[1vw] rounded-tr-[0.2vw] px-[4%] py-[2.5%]" style={{ fontSize: '1.35vh', maxWidth: '82%' }}>
                Which of my subscriptions can I cancel to save 100 SAR a month?
              </div>
              <div className="self-start bg-white/5 text-white/80 rounded-[1vw] rounded-tl-[0.2vw] px-[4%] py-[2.5%]" style={{ fontSize: '1.35vh', maxWidth: '88%', lineHeight: 1.5 }}>
                Based on your subscriptions, cancelling <span className="text-primary font-semibold">Shahid VIP</span> (79 SAR) and <span className="text-primary font-semibold">OSN+</span> (49 SAR) would save you <span className="text-accent font-semibold">128 SAR/mo</span>. Both have free tiers worth trying first.
              </div>
              <div className="self-end bg-primary/20 text-white rounded-[1vw] rounded-tr-[0.2vw] px-[4%] py-[2.5%]" style={{ fontSize: '1.35vh', maxWidth: '78%' }}>
                When will I reach my Hajj fund goal?
              </div>
              <div className="self-start bg-white/5 text-white/80 rounded-[1vw] rounded-tl-[0.2vw] px-[4%] py-[2.5%]" style={{ fontSize: '1.35vh', maxWidth: '88%', lineHeight: 1.5 }}>
                At your current pace you'll reach <span className="text-accent font-semibold">15,000 SAR</span> in <span className="text-accent font-semibold">8 months</span> — right before Dhul Hijjah. 🕌
              </div>
            </div>
            {/* Input bar */}
            <div className="px-[4%] pb-[5%] pt-[2%]">
              <div className="bg-white/5 rounded-full px-[5%] py-[2.5%] text-white/30" style={{ fontSize: '1.3vh' }}>
                Ask anything about your finances…
              </div>
            </div>
          </div>
        </div>

        {/* Right: text */}
        <div className="flex-1">
          <p className="font-body text-[1.5vw] font-semibold tracking-[0.25em] uppercase text-primary mb-[2vh]">
            Step 9 · Premium
          </p>
          <h2 className="font-display font-bold text-[3.4vw] leading-tight tracking-tight text-text [text-wrap:balance]">
            Your AI Budget Agent
          </h2>
          <p className="font-body text-[1.9vw] text-muted mt-[1.8vh] mb-[4.5vh] [text-wrap:pretty]">
            A conversational assistant with full context of your finances — subscriptions, bills, loans, and goals.
          </p>
          <div className="flex flex-col gap-[3vh]">
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">1</div>
              <p className="font-body text-[1.75vw] leading-snug text-text [text-wrap:pretty]">
                Tap <span className="font-semibold text-primary">AI Agent</span> from the nav menu — available on Premium
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">2</div>
              <p className="font-body text-[1.75vw] leading-snug text-text [text-wrap:pretty]">
                Ask in plain Arabic or English — "which loans should I pay first?" or "can I afford a new subscription?"
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">3</div>
              <p className="font-body text-[1.75vw] leading-snug text-text [text-wrap:pretty]">
                It reads your live data — real amounts, real deadlines, real goals — not generic advice
              </p>
            </div>
            <div className="mt-[1vh] flex flex-wrap gap-[1.2vw]">
              {prompts.map(({ text, color }) => (
                <span key={text} className={`font-body text-[1.45vw] px-[1.2vw] py-[0.7vh] rounded-full ${color} font-medium`}>
                  {text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
