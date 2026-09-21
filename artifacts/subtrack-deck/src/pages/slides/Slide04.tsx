const base = import.meta.env.BASE_URL;

export default function Slide04() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#0A0E1A', fontFamily: "'Inter', sans-serif", position: 'relative', color: '#FFFFFF' }}>

      <div style={{ position: 'absolute', top: '-10vh', right: '-5vw', width: '45vw', height: '45vw', borderRadius: '50%', backgroundColor: '#7B6CF8', opacity: 0.06, filter: 'blur(10vw)' }} />
      <div style={{ position: 'absolute', bottom: '-10vh', left: '-5vw', width: '40vw', height: '40vw', borderRadius: '50%', backgroundColor: '#00D9A6', opacity: 0.05, filter: 'blur(9vw)' }} />
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

        {/* Left: features */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.5vh 1.2vw', backgroundColor: 'rgba(123,108,248,0.12)', border: '1px solid rgba(123,108,248,0.3)', borderRadius: '2vw', color: '#7B6CF8', fontSize: '0.9vw', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2.5vh', alignSelf: 'flex-start' }}>
            Home Screen
          </div>
          <h2 style={{ fontSize: '3.2vw', fontWeight: 800, margin: '0 0 1vh 0', lineHeight: 1.1, letterSpacing: '-0.04em' }}>
            The <span style={{ color: '#7B6CF8' }}>Dashboard</span>
          </h2>
          <p style={{ fontSize: '1.15vw', fontWeight: 300, color: 'rgba(255,255,255,0.5)', margin: '0 0 3vh 0', lineHeight: 1.5 }}>
            Your entire financial picture in a single scroll.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.2vh' }}>
            {[
              ['#7B6CF8', 'Live monthly outflow across subs, bills, and loans', 'One number, always current'],
              ['#00D9A6', 'Upcoming payments carousel — due within 7 days', 'Colour-coded by type: sub, bill, loan, trial'],
              ['#7B6CF8', 'Overspend banner — dismissed once per calendar month', 'Warns when a budget cap has been crossed'],
              ['#00D9A6', 'Savings goal progress widget — visible from day one', 'Contribution ring with Gregorian + Hijri dates'],
              ['#F59E0B', 'Dark / light / system theme — one tap in Settings', 'Persistent across force-quit and reinstall'],
            ].map(([color, title, sub]) => (
              <div key={title} style={{ display: 'flex', gap: '1.2vw', alignItems: 'flex-start' }}>
                <div style={{ width: '0.3vw', alignSelf: 'stretch', backgroundColor: color as string, borderRadius: '0.2vw', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '1.2vw', fontWeight: 600 }}>{title}</div>
                  <div style={{ fontSize: '0.95vw', color: 'rgba(255,255,255,0.38)', fontWeight: 300, marginTop: '0.2vh' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: real screenshot framed in a phone */}
        <div style={{ width: '22vw', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5vh' }}>
          <div style={{ position: 'relative', width: '20vw' }}>
            {/* Phone frame */}
            <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(255,255,255,0.1)', borderRadius: '2.5vw', zIndex: 2, pointerEvents: 'none', boxShadow: '0 0 0 1px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)' }} />
            <img
              src={`${base}screens/home.jpg`}
              crossOrigin="anonymous"
              alt="SubTrack home screen"
              style={{ width: '100%', borderRadius: '2.5vw', display: 'block', boxShadow: '0 4vh 8vh rgba(0,0,0,0.7)' }}
            />
          </div>
          <div style={{ fontSize: '0.8vw', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em', textAlign: 'center' }}>Actual app — Expo Go</div>
        </div>

      </div>

      <div style={{ position: 'absolute', bottom: '3.5vh', left: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>SUBTRACK</div>
      <div style={{ position: 'absolute', bottom: '3.5vh', right: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)' }}>04 / 14</div>
    </div>
  );
}
