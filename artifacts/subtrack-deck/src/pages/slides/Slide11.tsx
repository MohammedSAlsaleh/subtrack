export default function Slide11() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#0A0E1A', fontFamily: "'Inter', sans-serif", position: 'relative', color: '#FFFFFF' }}>

      <div style={{ position: 'absolute', top: '-10vh', left: '-5vw', width: '45vw', height: '45vw', borderRadius: '50%', backgroundColor: '#7B6CF8', opacity: 0.07, filter: 'blur(10vw)' }} />
      <div style={{ position: 'absolute', bottom: '-10vh', right: '-5vw', width: '40vw', height: '40vw', borderRadius: '50%', backgroundColor: '#00D9A6', opacity: 0.05, filter: 'blur(9vw)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '4vw 4vw', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ position: 'absolute', top: '4.5vh', left: '5vw', display: 'flex', alignItems: 'center', gap: '0.8vw', zIndex: 10 }}>
        <div style={{ width: '2vw', height: '2vw', backgroundColor: '#7B6CF8', borderRadius: '0.4vw', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontSize: '0.85vw', fontWeight: 800 }}>ST</span>
        </div>
        <div style={{ fontSize: '1.1vw', fontWeight: 700, letterSpacing: '-0.02em' }}>SubTrack</div>
      </div>
      <div style={{ position: 'absolute', top: '4.5vh', right: '5vw', fontSize: '1vw', color: 'rgba(255,255,255,0.4)', zIndex: 10 }}>2026</div>

      <div style={{ position: 'absolute', top: '11vh', bottom: '9vh', left: '5vw', right: '5vw', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4vw', zIndex: 10 }}>

        {/* Left: text */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.5vh 1.2vw', backgroundColor: 'rgba(123,108,248,0.12)', border: '1px solid rgba(123,108,248,0.3)', borderRadius: '2vw', color: '#7B6CF8', fontSize: '0.9vw', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2.5vh', alignSelf: 'flex-start' }}>
            Premium Feature
          </div>
          <h2 style={{ fontSize: '3.2vw', fontWeight: 800, margin: '0 0 1vh 0', lineHeight: 1.1, letterSpacing: '-0.04em' }}>
            AI Budget <span style={{ color: '#7B6CF8' }}>Agent</span>
          </h2>
          <p style={{ fontSize: '1.15vw', fontWeight: 300, color: 'rgba(255,255,255,0.5)', margin: '0 0 3vh 0', lineHeight: 1.5 }}>
            Personalised financial advice powered by your real spending — subscriptions, bills, and loans.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.2vh' }}>
            {[
              ['#7B6CF8', 'Full financial context — subs, bills, loans, total debt, monthly payments'],
              ['#00D9A6', 'Recommends subscriptions to cut based on your budget target'],
              ['#7B6CF8', 'Cancel assistant — pre-filled prompt on how to cancel each service'],
              ['#00D9A6', 'Shared subscription splitting — divide cost by number of members'],
              ['#7B6CF8', 'Spots duplicates — surfaces services you\'re paying for twice'],
              ['#00D9A6', 'Bilingual — responds in Arabic or English based on app language'],
            ].map(([color, text]) => (
              <div key={text} style={{ display: 'flex', gap: '1.2vw', alignItems: 'flex-start' }}>
                <div style={{ width: '0.3vw', alignSelf: 'stretch', backgroundColor: color as string, borderRadius: '0.2vw', flexShrink: 0 }} />
                <div style={{ fontSize: '1.15vw', fontWeight: 500, lineHeight: 1.4, color: 'rgba(255,255,255,0.85)' }}>{text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: chat mockup */}
        <div style={{ width: '32vw', flexShrink: 0 }}>
          <div style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1.2vw', overflow: 'hidden', boxShadow: '0 3vh 6vh rgba(0,0,0,0.5)' }}>
            {/* Agent header */}
            <div style={{ padding: '1.2vw 1.5vw', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.8vw' }}>
              <div style={{ width: '1.8vw', height: '1.8vw', borderRadius: '50%', backgroundColor: 'rgba(123,108,248,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.65vw', fontWeight: 800, color: '#7B6CF8' }}>AI</span>
              </div>
              <div>
                <div style={{ fontSize: '0.9vw', fontWeight: 600 }}>Budget Agent</div>
                <div style={{ fontSize: '0.72vw', color: '#00D9A6' }}>Online</div>
              </div>
            </div>

            {/* Chat */}
            <div style={{ padding: '1.2vw 1.5vw', display: 'flex', flexDirection: 'column', gap: '1.4vh' }}>

              {/* Agent */}
              <div style={{ display: 'flex', gap: '0.8vw', alignItems: 'flex-start' }}>
                <div style={{ width: '1.3vw', height: '1.3vw', borderRadius: '50%', backgroundColor: 'rgba(123,108,248,0.2)', flexShrink: 0, marginTop: '0.2vh' }} />
                <div style={{ backgroundColor: 'rgba(123,108,248,0.1)', border: '1px solid rgba(123,108,248,0.15)', borderRadius: '0 0.7vw 0.7vw 0.7vw', padding: '0.8vh 0.9vw', maxWidth: '85%' }}>
                  <p style={{ margin: 0, fontSize: '0.85vw', lineHeight: 1.5, color: 'rgba(255,255,255,0.85)' }}>You're spending SAR 3,847/mo — including SAR 1,200 on debt payments. Your highest-rate loan is at 24% APR. Want me to build a payoff plan?</p>
                </div>
              </div>

              {/* User */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ backgroundColor: 'rgba(0,217,166,0.08)', border: '1px solid rgba(0,217,166,0.15)', borderRadius: '0.7vw 0 0.7vw 0.7vw', padding: '0.8vh 0.9vw' }}>
                  <p style={{ margin: 0, fontSize: '0.85vw', lineHeight: 1.5, color: 'rgba(255,255,255,0.85)' }}>Yes, and how do I cancel Jawwy TV?</p>
                </div>
              </div>

              {/* Agent */}
              <div style={{ display: 'flex', gap: '0.8vw', alignItems: 'flex-start' }}>
                <div style={{ width: '1.3vw', height: '1.3vw', borderRadius: '50%', backgroundColor: 'rgba(123,108,248,0.2)', flexShrink: 0, marginTop: '0.2vh' }} />
                <div style={{ backgroundColor: 'rgba(123,108,248,0.1)', border: '1px solid rgba(123,108,248,0.15)', borderRadius: '0 0.7vw 0.7vw 0.7vw', padding: '0.8vh 0.9vw', maxWidth: '85%' }}>
                  <p style={{ margin: 0, fontSize: '0.85vw', lineHeight: 1.5, color: 'rgba(255,255,255,0.85)' }}>Cutting Jawwy TV saves SAR 69/mo. <span style={{ color: '#00D9A6' }}>Cancel steps:</span> App → Profile → Subscriptions → Cancel Plan. Confirm on next screen.</p>
                </div>
              </div>

              {/* User */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ backgroundColor: 'rgba(0,217,166,0.08)', border: '1px solid rgba(0,217,166,0.15)', borderRadius: '0.7vw 0 0.7vw 0.7vw', padding: '0.8vh 0.9vw' }}>
                  <p style={{ margin: 0, fontSize: '0.85vw', lineHeight: 1.5, color: 'rgba(255,255,255,0.85)' }}>Now build the payoff plan</p>
                </div>
              </div>

              {/* Agent */}
              <div style={{ display: 'flex', gap: '0.8vw', alignItems: 'flex-start' }}>
                <div style={{ width: '1.3vw', height: '1.3vw', borderRadius: '50%', backgroundColor: 'rgba(123,108,248,0.2)', flexShrink: 0, marginTop: '0.2vh' }} />
                <div style={{ backgroundColor: 'rgba(123,108,248,0.1)', border: '1px solid rgba(123,108,248,0.15)', borderRadius: '0 0.7vw 0.7vw 0.7vw', padding: '0.8vh 0.9vw', maxWidth: '85%' }}>
                  <p style={{ margin: 0, fontSize: '0.85vw', lineHeight: 1.5, color: 'rgba(255,255,255,0.85)' }}>Targeting the 24% card first (avalanche): debt-free in <span style={{ color: '#7B6CF8', fontWeight: 700 }}>11 months</span>, saving SAR 3,200 in interest vs. minimum payments.</p>
                </div>
              </div>

              {/* Input bar */}
              <div style={{ marginTop: '0.4vh', padding: '0.8vh 0.9vw', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.6vw', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8vw', color: 'rgba(255,255,255,0.2)' }}>Ask about your spending...</span>
                <div style={{ width: '1.1vw', height: '1.1vw', borderRadius: '50%', backgroundColor: '#7B6CF8', opacity: 0.6 }} />
              </div>
            </div>
          </div>
        </div>

      </div>

      <div style={{ position: 'absolute', bottom: '3.5vh', left: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>SUBTRACK</div>
      <div style={{ position: 'absolute', bottom: '3.5vh', right: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)' }}>11 / 14</div>
    </div>
  );
}
