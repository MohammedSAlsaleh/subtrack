export default function Slide12() {
  const features = [
    'Bills tracker — rent, utilities, telecom, insurance',
    'Loan tracker — credit cards, BNPL, personal loans',
    'Debt payoff simulator with interactive timeline chart',
    'Share payoff plan as a locale-aware image',
    'Analytics tab — 6-month trends, donut, creep score',
    'Monthly savings rate & income allocation breakdown',
    'Category budget caps with amber/red live indicators',
    'Savings goals — Hajj/Umrah presets, Hijri calendar',
    'Smart alerts — trial countdowns, due-soon highlights',
    'Pre-renewal notifications even when app is closed',
    'Overspend banners — per-category, monthly dismiss',
    'Duplicate detector & CSV export with budget/goal data',
    'AI Budget Agent — full financial context, bilingual',
    'Cancel assistant — step-by-step for every service',
    'Shared subscription cost splitting by member count',
    'Dark / Light / System theme — persistent across reinstalls',
    'Entitlements backed by Postgres — survive reinstalls',
  ];

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#0A0E1A', fontFamily: "'Inter', sans-serif", position: 'relative', color: '#FFFFFF' }}>

      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '55vw', height: '55vw', borderRadius: '50%', backgroundColor: '#7B6CF8', opacity: 0.05, filter: 'blur(14vw)' }} />
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

        {/* Left: price */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.5vh 1.2vw', backgroundColor: 'rgba(123,108,248,0.12)', border: '1px solid rgba(123,108,248,0.3)', borderRadius: '2vw', color: '#7B6CF8', fontSize: '0.9vw', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2.5vh', alignSelf: 'flex-start' }}>
            Premium
          </div>
          <h2 style={{ fontSize: '3.2vw', fontWeight: 800, margin: '0 0 0.8vh 0', lineHeight: 1.05, letterSpacing: '-0.04em' }}>Unlock the full picture</h2>
          <p style={{ fontSize: '1.15vw', fontWeight: 300, color: 'rgba(255,255,255,0.5)', margin: '0 0 3.5vh 0', lineHeight: 1.5 }}>Everything you need to own your recurring finances</p>

          {/* Price */}
          <div style={{ marginBottom: '3vh' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4vw', marginBottom: '0.8vh' }}>
              <span style={{ fontSize: '1.2vw', fontWeight: 300, color: 'rgba(255,255,255,0.5)', paddingBottom: '0.8vh' }}>SAR</span>
              <span style={{ fontSize: '6vw', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.05em', color: '#7B6CF8' }}>14.99</span>
              <span style={{ fontSize: '1.2vw', fontWeight: 300, color: 'rgba(255,255,255,0.45)', paddingBottom: '0.8vh' }}>/ month</span>
            </div>
            <div style={{ fontSize: '0.95vw', color: 'rgba(255,255,255,0.3)', fontWeight: 300 }}>Entitlements backed by the server — survive reinstalls and device switches</div>
          </div>

          {/* Free tier note */}
          <div style={{ padding: '1.5vh 1.5vw', backgroundColor: 'rgba(0,217,166,0.06)', border: '1px solid rgba(0,217,166,0.15)', borderRadius: '0.7vw' }}>
            <div style={{ fontSize: '0.95vw', fontWeight: 600, color: '#00D9A6', marginBottom: '0.4vh' }}>Free tier included</div>
            <div style={{ fontSize: '0.88vw', color: 'rgba(255,255,255,0.4)', fontWeight: 300, lineHeight: 1.5 }}>Subscription tracking, upcoming carousel, renewal alerts, basic settings, and dark mode — free forever.</div>
          </div>
        </div>

        {/* Right: feature checklist */}
        <div style={{ width: '40vw', flexShrink: 0 }}>
          <div style={{ backgroundColor: '#0F1625', border: '1px solid rgba(123,108,248,0.2)', borderRadius: '1.2vw', padding: '2.5vh 2vw', boxShadow: '0 0 4vw rgba(123,108,248,0.06)' }}>
            <div style={{ fontSize: '0.82vw', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2vh' }}>What's included in Premium</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.4vh 1.5vw' }}>
              {features.map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6vw' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#00D9A6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '0.9vw', height: '0.9vw', flexShrink: 0, marginTop: '0.25vh' }}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <div style={{ fontSize: '0.88vw', fontWeight: 400, lineHeight: 1.4, color: 'rgba(255,255,255,0.78)' }}>{f}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      <div style={{ position: 'absolute', bottom: '3.5vh', left: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>SUBTRACK</div>
      <div style={{ position: 'absolute', bottom: '3.5vh', right: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)' }}>12 / 14</div>
    </div>
  );
}
