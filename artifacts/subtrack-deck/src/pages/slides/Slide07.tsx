export default function Slide07() {
  const months = ['Jan','Feb','Mar','Apr','May','Jun'];
  const vals =   [1820, 2100, 2480, 2650, 3200, 3847];
  const maxVal = Math.max(...vals);

  // Category donut data
  const cats = [
    { label: 'Subs', pct: 31, color: '#7B6CF8' },
    { label: 'Bills', pct: 45, color: '#00D9A6' },
    { label: 'Loans', pct: 19, color: '#F59E0B' },
    { label: 'Goals', pct:  5, color: '#EC4899' },
  ];

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
            Analytics &amp; <span style={{ color: '#7B6CF8' }}>Intelligence</span>
          </h2>
          <p style={{ fontSize: '1.15vw', fontWeight: 300, color: 'rgba(255,255,255,0.5)', margin: '0 0 3vh 0', lineHeight: 1.5 }}>
            Understand where your money goes — month over month.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.2vh' }}>
            {[
              ['#7B6CF8', '6-month spend bar chart', 'Historical backfill reconstructed from subscription start dates'],
              ['#00D9A6', 'Category donut chart', 'Interactive SVG — tap any segment for a breakdown in SAR'],
              ['#7B6CF8', 'Subscription creep score', 'Quantifies how fast your recurring spend is growing'],
              ['#00D9A6', 'Monthly savings rate', 'Income vs. outflow percentage — how much you actually keep'],
              ['#F59E0B', 'Income allocation breakdown', 'What % of your income goes to each spending category'],
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

        {/* Right: analytics mockup */}
        <div style={{ width: '36vw', flexShrink: 0 }}>
          <div style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1.2vw', overflow: 'hidden', boxShadow: '0 3vh 6vh rgba(0,0,0,0.5)' }}>
            {/* titlebar */}
            <div style={{ padding: '1vw 1.4vw', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.45vw' }}>
                {['#FF5F56','#FFBD2E','#27C93F'].map(c => <div key={c} style={{ width: '0.65vw', height: '0.65vw', borderRadius: '50%', backgroundColor: c }} />)}
              </div>
              <div style={{ fontSize: '0.8vw', color: 'rgba(255,255,255,0.3)' }}>Analytics</div>
            </div>

            {/* Hero numbers */}
            <div style={{ padding: '1.2vw 1.5vw 0.8vw', display: 'flex', gap: '1vw' }}>
              {[['SAR 3,847','This month','#7B6CF8'],['↑ 20%','vs. last month','#F59E0B'],['34%','savings rate','#00D9A6']].map(([v,l,c]) => (
                <div key={l} style={{ flex: 1, padding: '0.9vh 0.8vw', backgroundColor: `${c}10`, border: `1px solid ${c}22`, borderRadius: '0.5vw' }}>
                  <div style={{ fontSize: '1.35vw', fontWeight: 800, color: c as string, lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: '0.7vw', color: 'rgba(255,255,255,0.35)', marginTop: '0.3vh' }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Bar chart */}
            <div style={{ padding: '0.5vw 1.5vw 0.8vw' }}>
              <div style={{ fontSize: '0.7vw', color: 'rgba(255,255,255,0.3)', marginBottom: '0.8vh', letterSpacing: '0.06em', textTransform: 'uppercase' }}>6-month spend</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5vw', height: '8vh' }}>
                {months.map((m, i) => (
                  <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3vh' }}>
                    <div style={{ width: '100%', height: `${(vals[i] / maxVal) * 7}vh`, backgroundColor: i === months.length - 1 ? '#7B6CF8' : 'rgba(123,108,248,0.3)', borderRadius: '0.25vw 0.25vw 0 0', transition: 'all 0.3s' }} />
                    <div style={{ fontSize: '0.6vw', color: 'rgba(255,255,255,0.3)' }}>{m}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category breakdown */}
            <div style={{ padding: '0 1.5vw 1.2vw' }}>
              <div style={{ fontSize: '0.7vw', color: 'rgba(255,255,255,0.3)', marginBottom: '0.8vh', letterSpacing: '0.06em', textTransform: 'uppercase' }}>By category</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6vh' }}>
                {cats.map(({ label, pct, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.7vw' }}>
                    <div style={{ width: '3.5vw', fontSize: '0.7vw', color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>{label}</div>
                    <div style={{ flex: 1, height: '0.4vw', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '0.2vw', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '0.2vw' }} />
                    </div>
                    <div style={{ width: '2.2vw', fontSize: '0.7vw', color, fontWeight: 600 }}>{pct}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Creep score */}
            <div style={{ margin: '0 1.5vw 1.2vw', padding: '0.8vh 1vw', backgroundColor: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: '0.5vw', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.7vw', color: 'rgba(255,255,255,0.4)', marginBottom: '0.2vh' }}>Subscription creep score</div>
                <div style={{ fontSize: '1.1vw', fontWeight: 800, color: '#F59E0B' }}>72 / 100</div>
              </div>
              <div style={{ fontSize: '0.8vw', color: 'rgba(245,158,11,0.7)', backgroundColor: 'rgba(245,158,11,0.1)', padding: '0.4vh 0.7vw', borderRadius: '0.3vw' }}>Moderate growth</div>
            </div>
          </div>
        </div>

      </div>

      <div style={{ position: 'absolute', bottom: '3.5vh', left: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>SUBTRACK</div>
      <div style={{ position: 'absolute', bottom: '3.5vh', right: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)' }}>07 / 14</div>
    </div>
  );
}
