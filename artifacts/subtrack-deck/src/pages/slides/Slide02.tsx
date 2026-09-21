export default function Slide02() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#0A0E1A', fontFamily: "'Inter', sans-serif", position: 'relative', color: '#FFFFFF' }}>

      <div style={{ position: 'absolute', top: '-10vh', left: '-5vw', width: '45vw', height: '45vw', borderRadius: '50%', backgroundColor: '#7B6CF8', opacity: 0.06, filter: 'blur(10vw)' }} />
      <div style={{ position: 'absolute', bottom: '-15vh', right: '-8vw', width: '40vw', height: '40vw', borderRadius: '50%', backgroundColor: '#00D9A6', opacity: 0.05, filter: 'blur(8vw)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '4vw 4vw', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ position: 'absolute', top: '4.5vh', left: '5vw', display: 'flex', alignItems: 'center', gap: '0.8vw', zIndex: 10 }}>
        <div style={{ width: '2vw', height: '2vw', backgroundColor: '#7B6CF8', borderRadius: '0.4vw', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontSize: '0.85vw', fontWeight: 800 }}>ST</span>
        </div>
        <div style={{ fontSize: '1.1vw', fontWeight: 700, letterSpacing: '-0.02em' }}>SubTrack</div>
      </div>
      <div style={{ position: 'absolute', top: '4.5vh', right: '5vw', fontSize: '1vw', color: 'rgba(255,255,255,0.4)', zIndex: 10 }}>2026</div>

      <div style={{ position: 'absolute', top: '11vh', bottom: '9vh', left: '5vw', right: '5vw', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6vw', zIndex: 10 }}>

        {/* Left: text */}
        <div style={{ flex: 1.1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.5vh 1.2vw', backgroundColor: 'rgba(123,108,248,0.12)', border: '1px solid rgba(123,108,248,0.3)', borderRadius: '2vw', color: '#7B6CF8', fontSize: '0.9vw', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3vh' }}>
            The Problem
          </div>
          <h2 style={{ fontSize: '4vw', fontWeight: 800, margin: '0 0 4.5vh 0', lineHeight: 1.05, letterSpacing: '-0.04em' }}>
            Subscriptions are <span style={{ color: '#7B6CF8' }}>silent money leaks.</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.8vh' }}>
            {[
              ['#7B6CF8', 'The average person subscribes to 12+ services and forgets half', 'Out of sight, out of mind — until the statement arrives'],
              ['#00D9A6', 'Bills, BNPL payments, and loans are scattered across apps and banks', 'No single source of truth'],
              ['#7B6CF8', 'Free trials convert silently after the grace period ends', 'Most users never cancel in time'],
              ['#00D9A6', 'No single place to see total recurring financial exposure in SAR', 'Estimates are always off — real numbers stay hidden'],
            ].map(([color, title, sub]) => (
              <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5vw' }}>
                <div style={{ width: '0.3vw', height: '5vh', backgroundColor: color, borderRadius: '0.2vw', marginTop: '0.3vh', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '1.55vw', fontWeight: 700, marginBottom: '0.3vh' }}>{title}</div>
                  <div style={{ fontSize: '1.1vw', color: 'rgba(255,255,255,0.4)', fontWeight: 300 }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: stat callouts */}
        <div style={{ width: '28vw', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '2vh' }}>
          {[
            ['SAR 847', 'avg. monthly wasted on forgotten subscriptions', '#7B6CF8'],
            ['43%', 'of free trials are forgotten before cancellation', '#00D9A6'],
            ['1 in 3', 'BNPL users miss a payment each month', '#F59E0B'],
          ].map(([stat, label, color]) => (
            <div key={stat} style={{ padding: '2.5vh 2vw', backgroundColor: '#111827', border: `1px solid ${color}25`, borderRadius: '1vw', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: color as string, opacity: 0.6 }} />
              <div style={{ fontSize: '3.5vw', fontWeight: 900, letterSpacing: '-0.04em', color: color as string, lineHeight: 1 }}>{stat}</div>
              <div style={{ fontSize: '1.05vw', color: 'rgba(255,255,255,0.45)', marginTop: '0.5vh', fontWeight: 300, lineHeight: 1.4 }}>{label}</div>
            </div>
          ))}
        </div>

      </div>

      <div style={{ position: 'absolute', bottom: '3.5vh', left: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>SUBTRACK</div>
      <div style={{ position: 'absolute', bottom: '3.5vh', right: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)' }}>02 / 14</div>
    </div>
  );
}
