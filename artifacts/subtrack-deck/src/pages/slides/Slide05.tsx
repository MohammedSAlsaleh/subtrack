export default function Slide05() {
  const modules = [
    { label: 'Subscriptions', sub: 'Status, cost, renewal date, free trial tracker', color: '#7B6CF8', icon: 'M2 5h20v14a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm0 5h20' },
    { label: 'Bills', sub: 'Rent, utilities, STC, insurance, telecom', color: '#00D9A6', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8' },
    { label: 'Loans & Simulator', sub: 'Credit cards, BNPL, payoff chart, share plan', color: '#F59E0B', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
    { label: 'Category Budgets', sub: 'Monthly SAR caps per category, amber/red alerts', color: '#EC4899', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
    { label: 'Savings Goals', sub: 'Hajj/Umrah presets, Hijri dates, home widget', color: '#00D9A6', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z' },
    { label: 'Analytics', sub: '6-month trends, donut chart, creep score, savings rate', color: '#7B6CF8', icon: 'M18 20V10M12 20V4M6 20v-6' },
    { label: 'Smart Alerts & Trials', sub: 'Trial countdowns, due-soon highlights, overspend banners', color: '#F59E0B', icon: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0' },
    { label: 'Cancel Assistant + Export', sub: 'AI-powered cancel guide, shared subs, CSV export', color: '#EC4899', icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' },
  ];

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#0A0E1A', fontFamily: "'Inter', sans-serif", position: 'relative', color: '#FFFFFF' }}>

      <div style={{ position: 'absolute', top: '10vh', left: '20vw', width: '40vw', height: '40vw', borderRadius: '50%', backgroundColor: '#7B6CF8', opacity: 0.05, filter: 'blur(12vw)' }} />
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

        <div style={{ textAlign: 'center', marginBottom: '3vh' }}>
          <h2 style={{ fontSize: '3.2vw', fontWeight: 800, margin: '0 0 0.6vh 0', lineHeight: 1.05, letterSpacing: '-0.04em' }}>All 8 Modules</h2>
          <p style={{ fontSize: '1.1vw', fontWeight: 300, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Everything SubTrack does — one slide</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.4vw', flex: 1 }}>
          {modules.map(({ label, sub, color, icon }) => (
            <div key={label} style={{ padding: '2vh 1.6vw', backgroundColor: '#111827', border: `1px solid ${color}25`, borderRadius: '0.8vw', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(to right, ${color}, transparent)` }} />
              <div style={{ width: '2.2vw', height: '2.2vw', backgroundColor: `${color}18`, borderRadius: '0.45vw', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.2vh' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.1vw', height: '1.1vw' }}>
                  {icon.split('M').slice(1).map((d, i) => <path key={i} d={`M${d}`} />)}
                </svg>
              </div>
              <div style={{ fontSize: '1.15vw', fontWeight: 700, marginBottom: '0.5vh', lineHeight: 1.2 }}>{label}</div>
              <div style={{ fontSize: '0.88vw', color: 'rgba(255,255,255,0.42)', fontWeight: 300, lineHeight: 1.5, flex: 1 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: '3.5vh', left: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>SUBTRACK</div>
      <div style={{ position: 'absolute', bottom: '3.5vh', right: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)' }}>05 / 14</div>
    </div>
  );
}
