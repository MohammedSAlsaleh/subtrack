export default function Slide10() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#0A0E1A', fontFamily: "'Inter', sans-serif", position: 'relative', color: '#FFFFFF' }}>

      <div style={{ position: 'absolute', top: '-10vh', right: '-5vw', width: '45vw', height: '45vw', borderRadius: '50%', backgroundColor: '#F59E0B', opacity: 0.04, filter: 'blur(10vw)' }} />
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

      <div style={{ position: 'absolute', top: '11vh', bottom: '9vh', left: '5vw', right: '5vw', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4vw', zIndex: 10 }}>

        {/* Left: text */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.5vh 1.2vw', backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '2vw', color: '#F59E0B', fontSize: '0.9vw', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2.5vh', alignSelf: 'flex-start' }}>
            Intelligence
          </div>
          <h2 style={{ fontSize: '3.2vw', fontWeight: 800, margin: '0 0 1vh 0', lineHeight: 1.1, letterSpacing: '-0.04em' }}>
            Smart Alerts &amp; <span style={{ color: '#F59E0B' }}>Trial Tracker</span>
          </h2>
          <p style={{ fontSize: '1.15vw', fontWeight: 300, color: 'rgba(255,255,255,0.5)', margin: '0 0 3vh 0', lineHeight: 1.5 }}>
            Know before you are charged — never get caught out again.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.2vh' }}>
            {[
              ['#F59E0B', 'Trial countdown badges', 'Days remaining shown on every subscription in free trial'],
              ['#7B6CF8', 'Pre-renewal notifications', 'Warn before a trial ends — even if the app isn\'t open'],
              ['#F59E0B', 'Due-soon highlights', 'Colour-coded ring on any payment due within 3 days'],
              ['#00D9A6', 'Overspend banner', 'Dismissible in-app alert when a budget cap is crossed'],
              ['#7B6CF8', 'Duplicate detector', 'Warns when the same service appears twice in your list'],
              ['#F59E0B', 'Edit trial status', 'Correct trial flag and end date on any subscription after adding'],
            ].map(([color, title, sub]) => (
              <div key={title} style={{ display: 'flex', gap: '1.2vw', alignItems: 'flex-start' }}>
                <div style={{ width: '0.3vw', alignSelf: 'stretch', backgroundColor: color as string, borderRadius: '0.2vw', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '1.15vw', fontWeight: 600 }}>{title}</div>
                  <div style={{ fontSize: '0.92vw', color: 'rgba(255,255,255,0.38)', fontWeight: 300, marginTop: '0.15vh' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: alert mockup */}
        <div style={{ width: '34vw', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1.2vh' }}>

          {/* Overspend banner */}
          <div style={{ padding: '1.4vh 1.4vw', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '0.8vw', display: 'flex', alignItems: 'center', gap: '0.8vw' }}>
            <div style={{ width: '1.8vw', height: '1.8vw', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '0.9vw', height: '0.9vw' }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '0.9vw', fontWeight: 700, color: '#EF4444' }}>Budget exceeded — Streaming</div>
              <div style={{ fontSize: '0.78vw', color: 'rgba(255,255,255,0.5)', marginTop: '0.2vh' }}>You spent SAR 284 of your SAR 300 cap (95%)</div>
            </div>
          </div>

          {/* Trial countdown cards */}
          <div style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.8vw', padding: '1vw 1.3vw' }}>
            <div style={{ fontSize: '0.72vw', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1vh' }}>Active trials</div>
            {[['Shahid VIP','Free trial','3 days left','#EF4444'],['Apple Music','Free trial','11 days left','#F59E0B'],['Adobe CC','Free trial','21 days left','#00D9A6']].map(([n,t,d,c]) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8vh 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7vw' }}>
                  <div style={{ width: '1.4vw', height: '1.4vw', borderRadius: '0.3vw', backgroundColor: `${c}20` }} />
                  <div>
                    <div style={{ fontSize: '0.85vw', fontWeight: 600 }}>{n}</div>
                    <div style={{ fontSize: '0.65vw', color: 'rgba(255,255,255,0.3)' }}>{t}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.78vw', color: c as string, fontWeight: 700, backgroundColor: `${c}15`, padding: '0.3vh 0.6vw', borderRadius: '0.3vw' }}>{d}</div>
              </div>
            ))}
          </div>

          {/* Due-soon */}
          <div style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.8vw', padding: '1vw 1.3vw' }}>
            <div style={{ fontSize: '0.72vw', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1vh' }}>Due within 3 days</div>
            {[['Netflix','SAR 39','Tomorrow','#EF4444'],['STC','SAR 250','In 2 days','#F59E0B']].map(([n,a,d,c]) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.7vh 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7vw' }}>
                  <div style={{ width: '0.5vw', height: '0.5vw', borderRadius: '50%', backgroundColor: c as string }} />
                  <div style={{ fontSize: '0.85vw', fontWeight: 500 }}>{n}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5vw', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.72vw', color: 'rgba(255,255,255,0.4)' }}>{d}</div>
                  <div style={{ fontSize: '0.85vw', fontWeight: 700 }}>{a}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Duplicate warning */}
          <div style={{ padding: '1.2vh 1.3vw', backgroundColor: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '0.8vw', display: 'flex', alignItems: 'center', gap: '0.8vw' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.2vw', height: '1.2vw', flexShrink: 0 }}>
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            <div style={{ fontSize: '0.85vw', color: 'rgba(255,255,255,0.75)' }}><span style={{ color: '#F59E0B', fontWeight: 700 }}>Possible duplicate:</span> Netflix appears twice — review &amp; resolve</div>
          </div>

        </div>

      </div>

      <div style={{ position: 'absolute', bottom: '3.5vh', left: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>SUBTRACK</div>
      <div style={{ position: 'absolute', bottom: '3.5vh', right: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)' }}>10 / 14</div>
    </div>
  );
}
