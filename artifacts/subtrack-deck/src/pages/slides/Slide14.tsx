export default function Slide14() {
  const roadmap = [
    {
      phase: 'Monetisation',
      color: '#7B6CF8',
      title: 'RevenueCat integration',
      body: 'App Store and Google Play in-app purchases — replacing dev-only grant endpoints with a production-safe webhook flow',
    },
    {
      phase: 'Push Notifications',
      color: '#00D9A6',
      title: 'Native renewal alerts',
      body: 'iOS and Android push before every renewal and trial expiry — even when the app is closed',
    },
    {
      phase: 'Open Banking',
      color: '#00D9A6',
      title: 'Lean Technologies webhook',
      body: 'Subscriptions auto-detected from bank transactions — zero manual entry for Mada and SARIE transfers',
    },
    {
      phase: 'Platform',
      color: '#7B6CF8',
      title: 'iOS & Android widgets',
      body: 'Home screen widgets showing monthly outflow, goals progress, and next renewal at a glance',
    },
    {
      phase: 'Intelligence',
      color: '#F59E0B',
      title: 'Lean income verification',
      body: 'Pull verified salary deposits via Lean Technologies open banking to unlock accurate income-to-spend ratios and goal projections',
    },
    {
      phase: 'Launch',
      color: '#EC4899',
      title: 'App Store & Google Play',
      body: 'Production release to Saudi Arabia — App Store Connect, Google Play Console, age ratings, Arabic screenshots, and KSA privacy compliance',
    },
  ];

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#0A0E1A', fontFamily: "'Inter', sans-serif", position: 'relative', color: '#FFFFFF' }}>

      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '60vw', height: '60vw', borderRadius: '50%', backgroundColor: '#7B6CF8', opacity: 0.04, filter: 'blur(15vw)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '4vw 4vw', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ position: 'absolute', top: '4.5vh', left: '5vw', display: 'flex', alignItems: 'center', gap: '0.8vw', zIndex: 10 }}>
        <div style={{ width: '2vw', height: '2vw', backgroundColor: '#7B6CF8', borderRadius: '0.4vw', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontSize: '0.85vw', fontWeight: 800 }}>ST</span>
        </div>
        <div style={{ fontSize: '1.1vw', fontWeight: 700, letterSpacing: '-0.02em' }}>SubTrack</div>
      </div>
      <div style={{ position: 'absolute', top: '4.5vh', right: '5vw', fontSize: '1vw', color: 'rgba(255,255,255,0.4)', zIndex: 10 }}>2026</div>

      <div style={{ position: 'absolute', top: '11vh', bottom: '9vh', left: '5vw', right: '5vw', display: 'flex', flexDirection: 'column', zIndex: 10 }}>

        <div style={{ textAlign: 'center', marginBottom: '3.5vh' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.5vh 1.2vw', backgroundColor: 'rgba(0,217,166,0.1)', border: '1px solid rgba(0,217,166,0.25)', borderRadius: '2vw', color: '#00D9A6', fontSize: '0.9vw', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1.5vh' }}>
            Roadmap
          </div>
          <h2 style={{ fontSize: '3.5vw', fontWeight: 800, margin: '0 0 0.6vh 0', lineHeight: 1.05, letterSpacing: '-0.04em' }}>What's Next</h2>
          <p style={{ fontSize: '1.15vw', fontWeight: 300, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Building toward the complete Saudi personal finance layer</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.8vw', flex: 1 }}>
          {roadmap.map(({ phase, color, title, body }) => (
            <div key={title} style={{ padding: '2.5vh 2vw', backgroundColor: '#111827', border: `1px solid ${color}22`, borderRadius: '1vw', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', background: `linear-gradient(to right, ${color}, transparent)` }} />
              <div style={{ fontSize: '0.78vw', fontWeight: 600, color, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.8vh' }}>{phase}</div>
              <div style={{ fontSize: '1.3vw', fontWeight: 700, marginBottom: '0.8vh', lineHeight: 1.25 }}>{title}</div>
              <div style={{ fontSize: '1vw', color: 'rgba(255,255,255,0.42)', fontWeight: 300, lineHeight: 1.55, flex: 1 }}>{body}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: '3.5vh', left: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>SUBTRACK</div>
      <div style={{ position: 'absolute', bottom: '3.5vh', right: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)' }}>14 / 14</div>
    </div>
  );
}
