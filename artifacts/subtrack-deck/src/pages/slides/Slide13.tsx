export default function Slide13() {
  const cols = [
    {
      label: 'Mobile',
      color: '#7B6CF8',
      items: ['React Native', 'Expo v54', 'Expo Router v6', 'TypeScript', 'TanStack Query', 'react-native-svg', 'AsyncStorage'],
    },
    {
      label: 'API Server',
      color: '#00D9A6',
      items: ['Node.js', 'Express v5', 'JWT Auth', 'OpenAI SSE stream', 'Pino Logging', 'TypeScript'],
    },
    {
      label: 'Database',
      color: '#7B6CF8',
      items: ['PostgreSQL', 'Drizzle ORM', 'server_users', 'premium_entitlements', 'Type-safe migrations'],
    },
    {
      label: 'Monorepo',
      color: '#00D9A6',
      items: ['pnpm workspaces', '@workspace/db', '@workspace/api-zod', 'Lean Technologies', 'Saudi Open Banking'],
    },
    {
      label: 'Security',
      color: '#F59E0B',
      items: ['SQL injection suite', 'JWT per-route enforcement', 'Auth middleware tests', 'DB retry + 503 hardening', 'Startup config validation'],
    },
  ];

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#0A0E1A', fontFamily: "'Inter', sans-serif", position: 'relative', color: '#FFFFFF' }}>

      <div style={{ position: 'absolute', top: '5vh', right: '-5vw', width: '40vw', height: '40vw', borderRadius: '50%', backgroundColor: '#7B6CF8', opacity: 0.06, filter: 'blur(10vw)' }} />
      <div style={{ position: 'absolute', bottom: '-5vh', left: '-5vw', width: '38vw', height: '38vw', borderRadius: '50%', backgroundColor: '#00D9A6', opacity: 0.05, filter: 'blur(9vw)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '4vw 4vw', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ position: 'absolute', top: '4.5vh', left: '5vw', display: 'flex', alignItems: 'center', gap: '0.8vw', zIndex: 10 }}>
        <div style={{ width: '2vw', height: '2vw', backgroundColor: '#7B6CF8', borderRadius: '0.4vw', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontSize: '0.85vw', fontWeight: 800 }}>ST</span>
        </div>
        <div style={{ fontSize: '1.1vw', fontWeight: 700, letterSpacing: '-0.02em' }}>SubTrack</div>
      </div>
      <div style={{ position: 'absolute', top: '4.5vh', right: '5vw', fontSize: '1vw', color: 'rgba(255,255,255,0.4)', zIndex: 10 }}>2026</div>

      <div style={{ position: 'absolute', top: '11vh', bottom: '9vh', left: '5vw', right: '5vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 10 }}>

        <div style={{ marginBottom: '3vh' }}>
          <h2 style={{ fontSize: '3.5vw', fontWeight: 800, margin: '0 0 0.6vh 0', lineHeight: 1.05, letterSpacing: '-0.04em' }}>Tech Stack</h2>
          <p style={{ fontSize: '1.15vw', fontWeight: 300, color: 'rgba(255,255,255,0.45)', margin: 0 }}>A fully-typed pnpm monorepo — mobile to database, secured end-to-end</p>
        </div>

        <div style={{ display: 'flex', gap: '1.4vw', flex: 1, alignItems: 'stretch' }}>
          {cols.map(({ label, color, items }) => (
            <div key={label} style={{ flex: 1, backgroundColor: '#111827', border: `1px solid ${color}30`, borderRadius: '1vw', padding: '2.2vh 1.4vw', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(to right, ${color}, transparent)` }} />
              <div style={{ fontSize: '0.72vw', fontWeight: 700, color, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.8vh' }}>{label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {items.map((item, i) => (
                  <div
                    key={item}
                    style={{
                      fontSize: i < 2 ? '1.08vw' : '0.95vw',
                      fontWeight: i < 2 ? 600 : 400,
                      color: i < 2 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)',
                      padding: '0.9vh 0',
                      borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: '3.5vh', left: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>SUBTRACK</div>
      <div style={{ position: 'absolute', bottom: '3.5vh', right: '5vw', fontSize: '0.85vw', color: 'rgba(255,255,255,0.25)' }}>13 / 14</div>
    </div>
  );
}
