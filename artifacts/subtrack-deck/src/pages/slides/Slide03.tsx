export default function Slide03() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#0A0E1A', fontFamily: "'Inter', sans-serif", position: 'relative', color: '#FFFFFF' }}>

      <div style={{ position: 'absolute', top: '-15vh', right: '-5vw', width: '50vw', height: '50vw', borderRadius: '50%', backgroundColor: '#7B6CF8', opacity: 0.07, filter: 'blur(9vw)' }} />
      <div style={{ position: 'absolute', bottom: '-10vh', left: '-8vw', width: '40vw', height: '40vw', borderRadius: '50%', backgroundColor: '#00D9A6', opacity: 0.05, filter: 'blur(8vw)' }} />
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

        {/* Left */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.5vh 1.2vw', backgroundColor: 'rgba(0,217,166,0.1)', border: '1px solid rgba(0,217,166,0.25)', borderRadius: '2vw', color: '#00D9A6', fontSize: '0.9vw', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2.5vh', alignSelf: 'flex-start' }}>
            The Solution
          </div>
          <h2 style={{ fontSize: '3.4vw', fontWeight: 800, margin: '0 0 1.2vh 0', lineHeight: 1.1, letterSpacing: '-0.04em' }}>
            Introducing <span style={{ color: '#7B6CF8' }}>SubTrack</span>
          </h2>
          <p style={{ fontSize: '1.2vw', fontWeight: 300, color: 'rgba(255,255,255,0.5)', margin: '0 0 3vh 0', lineHeight: 1.5 }}>
            One app for subscriptions, bills, loans, budgets, savings goals, analytics, and AI — all in SAR.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.2vh' }}>
            {[
              ['#7B6CF8', 'Unified dashboard — every recurring expense in one place', 'Subscriptions, bills, and loans tracked together'],
              ['#00D9A6', 'Analytics tab — 6-month trends, category breakdown, creep score', 'See exactly where your money is going month over month'],
              ['#7B6CF8', 'Smart alerts — trial countdowns, due-soon highlights, overspend banners', "Know before you're charged, not after"],
              ['#00D9A6', 'AI Budget Agent — personalised advice from your real data', 'Cancel assistant, duplicate detection, loan context'],
              ['#7B6CF8', 'Savings goals with Hijri calendar and Hajj/Umrah presets', 'Purpose-built for Saudi financial goals'],
            ].map(([color, title, sub]) => (
              <div key={title} style={{ display: 'flex', gap: '1.2vw', alignItems: 'flex-start' }}>
                <div style={{ width: '1.2vw', height: '1.2vw', borderRadius: '50%', backgroundColor: `${color}20`, border: `1px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.25vh' }}>
                  <div style={{ width: '0.4vw', height: '0.4vw', borderRadius: '50%', backgroundColor: color as string }} />
                </div>
                <div>
                  <div style={{ fontSize: '1.25vw', fontWeight: 600 }}>{title}</div>
                  <div style={{ fontSize: '0.95vw', color: 'rgba(255,255,255,0.38)', fontWeight: 300, marginTop: '0.2vh' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: dashboard mockup */}
        <div style={{ width: '31vw', flexShrink: 0 }}>
          <div style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1.2vw', overflow: 'hidden', boxShadow: '0 3vh 6vh rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
            {/* titlebar */}
            <div style={{ padding: '1vw 1.4vw', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.45vw' }}>
                {['#FF5F56','#FFBD2E','#27C93F'].map(c => <div key={c} style={{ width: '0.65vw', height: '0.65vw', borderRadius: '50%', backgroundColor: c }} />)}
              </div>
              <div style={{ fontSize: '0.8vw', color: 'rgba(255,255,255,0.3)' }}>Dashboard</div>
            </div>
            {/* Hero numbers */}
            <div style={{ padding: '1.4vw 1.5vw', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.75vw', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4vh' }}>Monthly outflow</div>
              <div style={{ fontSize: '2.2vw', fontWeight: 800, letterSpacing: '-0.03em' }}>SAR 3,847<span style={{ fontSize: '0.9vw', fontWeight: 400, color: 'rgba(255,255,255,0.35)', marginLeft: '0.3vw' }}>.50</span></div>
              <div style={{ display: 'flex', gap: '0.8vw', marginTop: '1vh' }}>
                {[['14 subs','#7B6CF8'],['6 bills','#00D9A6'],['3 loans','#F59E0B'],['2 goals','#EC4899']].map(([l,c]) => (
                  <div key={l} style={{ padding: '0.5vh 0.7vw', backgroundColor: `${c}15`, border: `1px solid ${c}25`, borderRadius: '0.35vw', fontSize: '0.65vw', color: c as string, fontWeight: 600 }}>{l}</div>
                ))}
              </div>
            </div>
            {/* items */}
            <div style={{ padding: '0.8vw 1.4vw', display: 'flex', flexDirection: 'column', gap: '0' }}>
              {[['Netflix','Streaming','SAR 39','2d','#7B6CF8'],['STC Play','Telecom','SAR 99','5d','#00D9A6'],['Car loan','Loan','SAR 1,850','7d','#F59E0B'],['Rent','Bill','SAR 3,500','8d','#EC4899']].map(([n,cat,amt,d,c]) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8vh 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.7vw' }}>
                    <div style={{ width: '1.4vw', height: '1.4vw', borderRadius: '0.3vw', backgroundColor: `${c}22` }} />
                    <div>
                      <div style={{ fontSize: '0.85vw', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{n}</div>
                      <div style={{ fontSize: '0.65vw', color: 'rgba(255,255,255,0.28)' }}>{cat}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5vw' }}>
                    <div style={{ fontSize: '0.6vw', color: c as string, backgroundColor: `${c}15`, padding: '0.15vh 0.4vw', borderRadius: '0.2vw', fontWeight: 600 }}>{d}</div>
                    <div style={{ fontSize: '0.85vw', fontWeight: 700 }}>{amt}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* goal bar */}
            <div style={{ margin: '0 1.4vw 1.2vw', padding: '0.8vh 0.8vw', backgroundColor: 'rgba(0,217,166,0.06)', border: '1px solid rgba(0,217,166,0.12)', borderRadius: '0.5vw' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5vh' }}>
                <div style={{ fontSize: '0.7vw', color: '#00D9A6' }}>Hajj goal</div>
                <div style={{ fontSize: '0.7vw', color: 'rgba(255,255,255,0.35)' }}>62%</div>
              </div>
              <div style={{ height: '0.3vw', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: '0.2vw', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '62%', backgroundColor: '#00D9A6', borderRadius: '0.2vw' }} />
              </div>
            </div>
          </div>
        </div>

      </div>

      <div style={{ position: 'absolute', bottom: '3.5vh', left: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>SUBTRACK</div>
      <div style={{ position: 'absolute', bottom: '3.5vh', right: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)' }}>03 / 14</div>
    </div>
  );
}
