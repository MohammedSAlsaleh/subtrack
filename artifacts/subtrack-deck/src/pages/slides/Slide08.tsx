export default function Slide08() {
  // Payoff chart data — balance over 12 months
  const balances = [48000, 44200, 40500, 36900, 33400, 29900, 26500, 23100, 19800, 16500, 13300, 10200];
  const maxBal = 48000;
  const w = 100; const h = 100;
  const pts = balances.map((b, i) => {
    const x = (i / (balances.length - 1)) * w;
    const y = h - (b / maxBal) * (h * 0.8) - h * 0.1;
    return `${x},${y}`;
  });
  const areaPath = `M0,${h} L${pts.join(' L')} L${w},${h} Z`;
  const linePath = `M${pts.join(' L')}`;

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
            Premium Feature
          </div>
          <h2 style={{ fontSize: '3.2vw', fontWeight: 800, margin: '0 0 1vh 0', lineHeight: 1.1, letterSpacing: '-0.04em' }}>
            Loans &amp; <span style={{ color: '#F59E0B' }}>Debt Intelligence</span>
          </h2>
          <p style={{ fontSize: '1.15vw', fontWeight: 300, color: 'rgba(255,255,255,0.5)', margin: '0 0 3vh 0', lineHeight: 1.5 }}>
            Understand your debt — then build a plan to beat it.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.2vh' }}>
            {[
              ['#7B6CF8', 'Loan tracker — credit cards, BNPL, personal loans', 'Unified view of all debt with monthly payment totals'],
              ['#F59E0B', 'High-APR warnings & credit card utilization gauge', 'Flags loans costing you the most, ranked by rate'],
              ['#7B6CF8', 'Debt payoff simulator — month-by-month projection', 'Snowball or avalanche — see your debt-free date'],
              ['#F59E0B', 'Interactive payoff timeline chart', 'Tap any month to see exact remaining balance'],
              ['#00D9A6', 'Share payoff plan as an image', 'Export locale-aware schedule via share sheet'],
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

        {/* Right: loan simulator mockup */}
        <div style={{ width: '36vw', flexShrink: 0 }}>
          <div style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1.2vw', overflow: 'hidden', boxShadow: '0 3vh 6vh rgba(0,0,0,0.5)' }}>
            {/* titlebar */}
            <div style={{ padding: '1vw 1.4vw', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.45vw' }}>
                {['#FF5F56','#FFBD2E','#27C93F'].map(c => <div key={c} style={{ width: '0.65vw', height: '0.65vw', borderRadius: '50%', backgroundColor: c }} />)}
              </div>
              <div style={{ fontSize: '0.8vw', color: 'rgba(255,255,255,0.3)' }}>Payoff Simulator</div>
            </div>

            {/* Loan summary */}
            <div style={{ padding: '1.2vw 1.5vw 0.8vw', display: 'flex', gap: '1vw' }}>
              {[['SAR 48,000','Total debt','#F59E0B'],['SAR 4,200','Monthly pmts','#7B6CF8'],['12 mo','To debt-free','#00D9A6']].map(([v,l,c]) => (
                <div key={l} style={{ flex: 1, padding: '0.9vh 0.8vw', backgroundColor: `${c}10`, border: `1px solid ${c}22`, borderRadius: '0.5vw' }}>
                  <div style={{ fontSize: '1.2vw', fontWeight: 800, color: c as string, lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: '0.68vw', color: 'rgba(255,255,255,0.35)', marginTop: '0.3vh' }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Payoff chart */}
            <div style={{ padding: '0 1.5vw 0.5vw' }}>
              <div style={{ fontSize: '0.7vw', color: 'rgba(255,255,255,0.3)', marginBottom: '0.6vh', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Balance over time</div>
              <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: '9vh', display: 'block' }}>
                <defs>
                  <linearGradient id="loanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#loanGrad)" />
                <path d={linePath} fill="none" stroke="#F59E0B" strokeWidth="2" />
                {/* tooltip dot at month 5 */}
                <circle cx={(4 / 11) * w} cy={h - (balances[4] / maxBal) * (h * 0.8) - h * 0.1} r="2" fill="#F59E0B" />
              </svg>
              {/* x labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3vh' }}>
                {['Now','3m','6m','9m','12m'].map(l => (
                  <div key={l} style={{ fontSize: '0.6vw', color: 'rgba(255,255,255,0.25)' }}>{l}</div>
                ))}
              </div>
            </div>

            {/* Loans list */}
            <div style={{ padding: '0.8vw 1.5vw 1.2vw' }}>
              <div style={{ fontSize: '0.7vw', color: 'rgba(255,255,255,0.3)', marginBottom: '0.6vh', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Active loans</div>
              {[['Car loan','Personal','SAR 28,000','8.5% APR','#7B6CF8'],['Credit card','Credit','SAR 12,000','24% APR','#F59E0B'],['BNPL','BNPL','SAR 8,000','0% APR','#00D9A6']].map(([n,t,b,r,c]) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.7vh 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6vw' }}>
                    <div style={{ width: '1.3vw', height: '1.3vw', borderRadius: '0.3vw', backgroundColor: `${c}20` }} />
                    <div>
                      <div style={{ fontSize: '0.82vw', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{n}</div>
                      <div style={{ fontSize: '0.62vw', color: 'rgba(255,255,255,0.3)' }}>{t}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.82vw', fontWeight: 700 }}>{b}</div>
                    <div style={{ fontSize: '0.62vw', color: r.includes('24') ? '#F59E0B' : 'rgba(255,255,255,0.3)' }}>{r}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      <div style={{ position: 'absolute', bottom: '3.5vh', left: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>SUBTRACK</div>
      <div style={{ position: 'absolute', bottom: '3.5vh', right: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)' }}>08 / 14</div>
    </div>
  );
}
