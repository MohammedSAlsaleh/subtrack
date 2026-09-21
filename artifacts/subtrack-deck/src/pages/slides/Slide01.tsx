const base = import.meta.env.BASE_URL;

export default function Slide01() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#0A0E1A', fontFamily: "'Inter', sans-serif", position: 'relative', color: '#FFFFFF' }}>

      {/* Hero image */}
      <img src={`${base}hero-bg.png`} crossOrigin="anonymous" alt=""
        style={{ position: 'absolute', right: 0, top: 0, width: '55vw', height: '100vh', objectFit: 'cover', opacity: 0.18,
          maskImage: 'linear-gradient(to left, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to right, #0A0E1A 48%, transparent 100%)' }} />

      {/* Blobs */}
      <div style={{ position: 'absolute', top: '-15vh', right: '-5vw', width: '45vw', height: '45vw', borderRadius: '50%', backgroundColor: '#7B6CF8', opacity: 0.07, filter: 'blur(9vw)' }} />
      <div style={{ position: 'absolute', bottom: '-15vh', left: '-5vw', width: '40vw', height: '40vw', borderRadius: '50%', backgroundColor: '#00D9A6', opacity: 0.04, filter: 'blur(11vw)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '4vw 4vw', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ position: 'absolute', top: '4.5vh', left: '5vw', display: 'flex', alignItems: 'center', gap: '0.8vw', zIndex: 10 }}>
        <div style={{ width: '2.2vw', height: '2.2vw', backgroundColor: '#7B6CF8', borderRadius: '0.4vw', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontSize: '0.85vw', fontWeight: 800 }}>ST</span>
        </div>
        <div style={{ fontSize: '1.1vw', fontWeight: 700, letterSpacing: '-0.02em' }}>SubTrack</div>
      </div>
      <div style={{ position: 'absolute', top: '4.5vh', right: '5vw', fontSize: '1vw', color: 'rgba(255,255,255,0.4)', zIndex: 10 }}>2026</div>

      {/* Main content */}
      <div style={{ position: 'absolute', top: '11vh', bottom: '9vh', left: '5vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '52vw', zIndex: 10 }}>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6vw', padding: '0.7vh 1.4vw', backgroundColor: 'rgba(123,108,248,0.12)', border: '1px solid rgba(123,108,248,0.3)', borderRadius: '2vw', color: '#7B6CF8', fontSize: '1vw', fontWeight: 500, marginBottom: '3.5vh', alignSelf: 'flex-start' }}>
          <div style={{ width: '0.45vw', height: '0.45vw', borderRadius: '50%', backgroundColor: '#7B6CF8' }} />
          Subscription Intelligence — Saudi Arabia
        </div>

        <h1 style={{ fontSize: '7.5vw', fontWeight: 900, margin: '0 0 2.5vh 0', lineHeight: 0.95, letterSpacing: '-0.05em' }}>
          Sub<span style={{ color: '#7B6CF8' }}>Track</span>
        </h1>

        <p style={{ fontSize: '1.7vw', fontWeight: 300, color: 'rgba(255,255,255,0.65)', margin: '0 0 1vh 0', lineHeight: 1.4 }}>
          Track every subscription, bill, and loan — built for Saudi Arabia.
        </p>
        <p style={{ fontSize: '1.3vw', fontWeight: 400, color: 'rgba(255,255,255,0.35)', margin: '0 0 4vh 0', lineHeight: 1.4 }}>
          Your financial life, finally under control.
        </p>

        {/* Row 1 */}
        <div style={{ display: 'flex', gap: '0.7vw', flexWrap: 'wrap', marginBottom: '0.8vh' }}>
          {['Subscriptions', 'Bills', 'Loans', 'Category Budgets', 'Savings Goals'].map(f => (
            <div key={f} style={{ padding: '0.7vh 1.2vw', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5vw', fontSize: '0.9vw', color: 'rgba(255,255,255,0.6)' }}>{f}</div>
          ))}
        </div>
        {/* Row 2 */}
        <div style={{ display: 'flex', gap: '0.7vw', flexWrap: 'wrap' }}>
          {['Analytics', 'Smart Alerts', 'Trial Tracker', 'Cancel Assistant', 'Data Export'].map(f => (
            <div key={f} style={{ padding: '0.7vh 1.2vw', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5vw', fontSize: '0.9vw', color: 'rgba(255,255,255,0.6)' }}>{f}</div>
          ))}
          <div style={{ padding: '0.7vh 1.2vw', backgroundColor: 'rgba(0,217,166,0.08)', border: '1px solid rgba(0,217,166,0.22)', borderRadius: '0.5vw', fontSize: '0.9vw', color: '#00D9A6', fontWeight: 500 }}>AI Budget Agent</div>
        </div>
      </div>

      {/* Right: phone mockup */}
      <div style={{ position: 'absolute', right: '5vw', top: '50%', transform: 'translateY(-50%)', width: '18vw', zIndex: 10 }}>
        <div style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2vw', overflow: 'hidden', boxShadow: '0 4vh 8vh rgba(0,0,0,0.7)', padding: '1.5vw' }}>
          {/* Status bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5vh' }}>
            <div style={{ fontSize: '0.65vw', color: 'rgba(255,255,255,0.3)' }}>9:41</div>
            <div style={{ display: 'flex', gap: '0.3vw' }}>
              {[1,2,3].map(i => <div key={i} style={{ width: '0.3vw', height: '0.3vw', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.3)' }} />)}
            </div>
          </div>
          {/* Total */}
          <div style={{ marginBottom: '1.5vh' }}>
            <div style={{ fontSize: '0.65vw', color: 'rgba(255,255,255,0.35)' }}>Monthly outflow</div>
            <div style={{ fontSize: '2vw', fontWeight: 800, color: '#7B6CF8', letterSpacing: '-0.03em' }}>SAR 3,847</div>
          </div>
          {/* Mini stat row */}
          <div style={{ display: 'flex', gap: '0.5vw', marginBottom: '1.5vh' }}>
            {[['14','Subs','#7B6CF8'],['6','Bills','#00D9A6'],['3','Loans','rgba(255,200,0,0.8)']].map(([n,l,c]) => (
              <div key={l} style={{ flex: 1, padding: '0.6vh 0.4vw', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '0.4vw', textAlign: 'center' }}>
                <div style={{ fontSize: '1.1vw', fontWeight: 700, color: c as string }}>{n}</div>
                <div style={{ fontSize: '0.55vw', color: 'rgba(255,255,255,0.3)' }}>{l}</div>
              </div>
            ))}
          </div>
          {/* Upcoming items */}
          {[['Netflix','SAR 39','2d','#7B6CF8'],['STC','SAR 250','5d','#00D9A6'],['BNPL','SAR 850','7d','#F59E0B']].map(([name, amt, d, c]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6vh 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5vw' }}>
                <div style={{ width: '1.1vw', height: '1.1vw', borderRadius: '0.25vw', backgroundColor: `${c}22` }} />
                <div style={{ fontSize: '0.75vw', color: 'rgba(255,255,255,0.7)' }}>{name}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4vw' }}>
                <div style={{ fontSize: '0.6vw', color: c as string, backgroundColor: `${c}15`, padding: '0.15vh 0.3vw', borderRadius: '0.2vw' }}>{d}</div>
                <div style={{ fontSize: '0.75vw', fontWeight: 600 }}>{amt}</div>
              </div>
            </div>
          ))}
          {/* Goals widget */}
          <div style={{ marginTop: '1.2vh', padding: '0.8vh 0.6vw', backgroundColor: 'rgba(0,217,166,0.07)', border: '1px solid rgba(0,217,166,0.15)', borderRadius: '0.5vw' }}>
            <div style={{ fontSize: '0.6vw', color: '#00D9A6', marginBottom: '0.4vh' }}>Hajj savings goal</div>
            <div style={{ height: '0.3vw', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '0.2vw', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '62%', backgroundColor: '#00D9A6', borderRadius: '0.2vw' }} />
            </div>
            <div style={{ fontSize: '0.6vw', color: 'rgba(255,255,255,0.35)', marginTop: '0.3vh' }}>SAR 12,400 / 20,000</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: '3.5vh', left: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', zIndex: 10 }}>SUBTRACK — SAUDI FINTECH</div>
      <div style={{ position: 'absolute', bottom: '3.5vh', right: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.2)', zIndex: 10 }}>01 / 14</div>
    </div>
  );
}
