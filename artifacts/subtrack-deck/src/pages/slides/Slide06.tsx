export default function Slide06() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#0A0E1A', fontFamily: "'Inter', sans-serif", position: 'relative', color: '#FFFFFF' }}>

      <div style={{ position: 'absolute', top: '-10vh', right: '-5vw', width: '45vw', height: '45vw', borderRadius: '50%', backgroundColor: '#00D9A6', opacity: 0.05, filter: 'blur(9vw)' }} />
      <div style={{ position: 'absolute', bottom: '-10vh', left: '-5vw', width: '40vw', height: '40vw', borderRadius: '50%', backgroundColor: '#7B6CF8', opacity: 0.06, filter: 'blur(9vw)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '4vw 4vw', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ position: 'absolute', top: '4.5vh', left: '5vw', display: 'flex', alignItems: 'center', gap: '0.8vw', zIndex: 10 }}>
        <div style={{ width: '2vw', height: '2vw', backgroundColor: '#7B6CF8', borderRadius: '0.4vw', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontSize: '0.85vw', fontWeight: 800 }}>ST</span>
        </div>
        <div style={{ fontSize: '1.1vw', fontWeight: 700, letterSpacing: '-0.02em' }}>SubTrack</div>
      </div>
      <div style={{ position: 'absolute', top: '4.5vh', right: '5vw', fontSize: '1vw', color: 'rgba(255,255,255,0.4)', zIndex: 10 }}>2026</div>

      <div style={{ position: 'absolute', top: '11vh', bottom: '9vh', left: '5vw', right: '5vw', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '5vw', zIndex: 10 }}>

        {/* Left: text */}
        <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.5vh 1.2vw', backgroundColor: 'rgba(0,217,166,0.1)', border: '1px solid rgba(0,217,166,0.25)', borderRadius: '2vw', color: '#00D9A6', fontSize: '0.9vw', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2.5vh', alignSelf: 'flex-start' }}>
            Saudi Market
          </div>
          <h2 style={{ fontSize: '3.5vw', fontWeight: 800, margin: '0 0 3.5vh 0', lineHeight: 1.1, letterSpacing: '-0.04em' }}>
            Built for <span style={{ color: '#00D9A6' }}>Saudi Arabia</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.8vh' }}>
            {[
              ['#7B6CF8', 'Native Arabic UI with full RTL layout — toggle in Settings'],
              ['#00D9A6', 'Saudi Riyal (SAR) throughout — no currency guesswork'],
              ['#7B6CF8', 'KYC-aware: validates National ID (starts with 1) and Iqama (starts with 2)'],
              ['#00D9A6', 'Hijri calendar support — savings goal deadlines in Hijri dates'],
              ['#7B6CF8', 'Saudi Open Banking via Lean Technologies — read-only bank linking'],
              ['#00D9A6', 'Pre-loaded local providers: STC, Jawwy, stc tv, Shahid, and more'],
              ['#7B6CF8', 'VAT-aware pricing — toggle 15% VAT on any subscription or bill'],
            ].map(([color, text]) => (
              <div key={text} style={{ display: 'flex', gap: '1.2vw', alignItems: 'flex-start' }}>
                <div style={{ width: '0.3vw', alignSelf: 'stretch', backgroundColor: color as string, borderRadius: '0.2vw', flexShrink: 0 }} />
                <div style={{ fontSize: '1.25vw', fontWeight: 500, lineHeight: 1.4, color: 'rgba(255,255,255,0.88)' }}>{text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: rings */}
        <div style={{ width: '28vw', height: '56vh', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', width: '26vw', height: '26vw', borderRadius: '50%', border: '1px solid rgba(0,217,166,0.14)' }} />
          <div style={{ position: 'absolute', width: '20vw', height: '20vw', borderRadius: '50%', border: '1px solid rgba(123,108,248,0.11)' }} />
          <div style={{ position: 'absolute', width: '14vw', height: '14vw', borderRadius: '50%', border: '1px solid rgba(0,217,166,0.09)' }} />
          <div style={{ position: 'relative', width: '9vw', height: '9vw', borderRadius: '50%', backgroundColor: 'rgba(0,217,166,0.07)', border: '1px solid rgba(0,217,166,0.22)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.3vh' }}>
            <div style={{ fontSize: '2vw', fontWeight: 800, color: '#00D9A6', lineHeight: 1 }}>SA</div>
            <div style={{ fontSize: '0.6vw', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>SAUDI ARABIA</div>
          </div>
          {/* Orbit dots */}
          {[['dot-top','50%','-2vh','#7B6CF8'],['dot-bottom','50%','2vh','#00D9A6'],['dot-left','-1.5vw','50%','#7B6CF8'],['dot-right','calc(100% + 1.5vw)','50%','#00D9A6']].map(([k,l,t,c]) => (
            <div key={k} style={{ position: 'absolute', left: l as string, top: t as string, width: '0.9vw', height: '0.9vw', borderRadius: '50%', backgroundColor: c as string, opacity: 0.7, transform: 'translate(-50%, -50%)' }} />
          ))}
        </div>

      </div>

      <div style={{ position: 'absolute', bottom: '3.5vh', left: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>SUBTRACK</div>
      <div style={{ position: 'absolute', bottom: '3.5vh', right: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)' }}>06 / 14</div>
    </div>
  );
}
