export default function Slide09() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#0A0E1A', fontFamily: "'Inter', sans-serif", position: 'relative', color: '#FFFFFF' }}>

      <div style={{ position: 'absolute', top: '-10vh', left: '20vw', width: '40vw', height: '40vw', borderRadius: '50%', backgroundColor: '#EC4899', opacity: 0.04, filter: 'blur(11vw)' }} />
      <div style={{ position: 'absolute', bottom: '-8vh', right: '-5vw', width: '35vw', height: '35vw', borderRadius: '50%', backgroundColor: '#00D9A6', opacity: 0.04, filter: 'blur(9vw)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '4vw 4vw', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ position: 'absolute', top: '4.5vh', left: '5vw', display: 'flex', alignItems: 'center', gap: '0.8vw', zIndex: 10 }}>
        <div style={{ width: '2vw', height: '2vw', backgroundColor: '#7B6CF8', borderRadius: '0.4vw', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontSize: '0.85vw', fontWeight: 800 }}>ST</span>
        </div>
        <div style={{ fontSize: '1.1vw', fontWeight: 700, letterSpacing: '-0.02em' }}>SubTrack</div>
      </div>
      <div style={{ position: 'absolute', top: '4.5vh', right: '5vw', fontSize: '1vw', color: 'rgba(255,255,255,0.4)', zIndex: 10 }}>2026</div>

      <div style={{ position: 'absolute', top: '11vh', bottom: '9vh', left: '5vw', right: '5vw', display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: '3vw', zIndex: 10 }}>

        {/* LEFT: Savings Goals */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.4vh 1vw', backgroundColor: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.25)', borderRadius: '2vw', color: '#EC4899', fontSize: '0.85vw', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '2vh', alignSelf: 'flex-start' }}>
            Savings Goals
          </div>
          <h3 style={{ fontSize: '2.4vw', fontWeight: 800, margin: '0 0 0.8vh 0', lineHeight: 1.1, letterSpacing: '-0.04em' }}>
            Save toward <span style={{ color: '#EC4899' }}>what matters</span>
          </h3>
          <p style={{ fontSize: '1.05vw', fontWeight: 300, color: 'rgba(255,255,255,0.45)', margin: '0 0 2.5vh 0', lineHeight: 1.5 }}>Purpose-built presets for Hajj, Umrah, and other Saudi financial milestones.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8vh' }}>
            {[
              ['#EC4899','Hajj & Umrah presets — tap to start a goal instantly'],
              ['#7B6CF8','Hijri calendar support — target dates in Gregorian and Hijri'],
              ['#EC4899','Contribution log — track each deposit with timestamps'],
              ['#00D9A6','Progress ring on home screen — visible without navigating away'],
              ['#7B6CF8','Edit goals safely — modifications never reset saved contributions'],
            ].map(([c, t]) => (
              <div key={t} style={{ display: 'flex', gap: '1vw', alignItems: 'flex-start' }}>
                <div style={{ width: '0.3vw', alignSelf: 'stretch', backgroundColor: c as string, borderRadius: '0.2vw', flexShrink: 0 }} />
                <div style={{ fontSize: '1.1vw', fontWeight: 500, lineHeight: 1.4, color: 'rgba(255,255,255,0.82)' }}>{t}</div>
              </div>
            ))}
          </div>

          {/* Goals card mockup */}
          <div style={{ marginTop: '2.5vh', backgroundColor: '#111827', border: '1px solid rgba(236,72,153,0.18)', borderRadius: '0.8vw', padding: '1.2vh 1.2vw' }}>
            {[['Hajj savings','SAR 12,400 / 20,000',62,'#EC4899'],['Emergency fund','SAR 8,100 / 15,000',54,'#7B6CF8'],['New car','SAR 3,200 / 50,000',6,'#00D9A6']].map(([n,amt,pct,c]) => (
              <div key={n} style={{ marginBottom: '1.2vh' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4vh' }}>
                  <div style={{ fontSize: '0.85vw', fontWeight: 600 }}>{n}</div>
                  <div style={{ fontSize: '0.75vw', color: 'rgba(255,255,255,0.4)' }}>{amt}</div>
                </div>
                <div style={{ height: '0.35vw', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '0.2vw', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, backgroundColor: c as string, borderRadius: '0.2vw' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.06)', alignSelf: 'stretch' }} />

        {/* RIGHT: Category Budgets */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.4vh 1vw', backgroundColor: 'rgba(0,217,166,0.1)', border: '1px solid rgba(0,217,166,0.25)', borderRadius: '2vw', color: '#00D9A6', fontSize: '0.85vw', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '2vh', alignSelf: 'flex-start' }}>
            Category Budgets
          </div>
          <h3 style={{ fontSize: '2.4vw', fontWeight: 800, margin: '0 0 0.8vh 0', lineHeight: 1.1, letterSpacing: '-0.04em' }}>
            Spend <span style={{ color: '#00D9A6' }}>within limits</span>
          </h3>
          <p style={{ fontSize: '1.05vw', fontWeight: 300, color: 'rgba(255,255,255,0.45)', margin: '0 0 2.5vh 0', lineHeight: 1.5 }}>Monthly SAR caps per spending category — amber at 80%, red when crossed.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8vh' }}>
            {[
              ['#00D9A6','Per-category caps — Streaming, Telecom, Food, etc.'],
              ['#7B6CF8','Amber warning at 80% — before you exceed the limit'],
              ['#00D9A6','Red alert when crossed — with a dismissible banner on home'],
              ['#7B6CF8','Income allocation view — % of income per category'],
              ['#00D9A6','Included in CSV export — caps exported alongside spend data'],
            ].map(([c, t]) => (
              <div key={t} style={{ display: 'flex', gap: '1vw', alignItems: 'flex-start' }}>
                <div style={{ width: '0.3vw', alignSelf: 'stretch', backgroundColor: c as string, borderRadius: '0.2vw', flexShrink: 0 }} />
                <div style={{ fontSize: '1.1vw', fontWeight: 500, lineHeight: 1.4, color: 'rgba(255,255,255,0.82)' }}>{t}</div>
              </div>
            ))}
          </div>

          {/* Budgets card mockup */}
          <div style={{ marginTop: '2.5vh', backgroundColor: '#111827', border: '1px solid rgba(0,217,166,0.18)', borderRadius: '0.8vw', padding: '1.2vh 1.2vw' }}>
            {([['Streaming','SAR 284 / 300',95,'#EF4444'],['Telecom','SAR 180 / 300',60,'#F59E0B'],['Food delivery','SAR 320 / 500',64,'#00D9A6'],['Loans','SAR 4,200 / 5,000',84,'#F59E0B']] as const).map(([n,lbl,pct,c]) => (
              <div key={n} style={{ marginBottom: '1.2vh' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4vh' }}>
                  <div style={{ fontSize: '0.85vw', fontWeight: 600 }}>{n}</div>
                  <div style={{ fontSize: '0.75vw', color: pct >= 90 ? '#EF4444' : pct >= 80 ? '#F59E0B' : 'rgba(255,255,255,0.4)' }}>{lbl}</div>
                </div>
                <div style={{ height: '0.35vw', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '0.2vw', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, backgroundColor: c as string, borderRadius: '0.2vw' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div style={{ position: 'absolute', bottom: '3.5vh', left: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>SUBTRACK</div>
      <div style={{ position: 'absolute', bottom: '3.5vh', right: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)' }}>09 / 14</div>
    </div>
  );
}
