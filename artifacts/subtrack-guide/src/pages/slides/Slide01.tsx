const base = import.meta.env.BASE_URL;

export default function Slide01() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-[#5B4BD5]">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#6C5CE7] via-[#5B4BD5] to-[#3F2FA8]" />
      <div className="absolute -top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-white/5" />
      <div className="absolute -bottom-[25%] -left-[8%] w-[35%] h-[35%] rounded-full bg-white/5" />

      {/* Phone — absolutely positioned so it never affects text layout */}
      <div
        className="absolute top-1/2 -translate-y-1/2 right-[4%] rounded-[2vw] border-[0.4vh] border-white/20 bg-[#0A0E1A] shadow-2xl overflow-hidden"
        style={{ height: '74%', aspectRatio: '462 / 934' }}
      >
        <img
          src={`${base}screens/welcome.jpg`}
          crossOrigin="anonymous"
          className="w-full h-full object-cover object-left-top"
          alt="SubTrack welcome screen"
        />
      </div>

      {/* Text — left half only, phone column reserved by right padding */}
      <div className="relative h-full flex flex-col justify-center pl-[6%] pr-[38%]">
        <p className="font-body text-[1.5vw] font-semibold tracking-[0.25em] uppercase text-white/60 mb-[2.5vh]">
          User Guide
        </p>
        <h1 className="font-display font-extrabold text-[5.2vw] leading-[1.05] tracking-tight text-white [text-wrap:balance]">
          Welcome to SubTrack
        </h1>
        <p className="font-body text-[2vw] text-white/80 mt-[3vh] [text-wrap:pretty]">
          Your personal subscription &amp; finance tracker for Saudi Arabia.
        </p>
        <div className="mt-[5vh] flex flex-col gap-[2.4vh]">
          {[
            'Track every SAR you pay for subscriptions, bills, and loans',
            'Connect your bank to auto-detect charges',
            'Available in English and Arabic',
          ].map((item) => (
            <div key={item} className="flex items-center gap-[1.1vw]">
              <div className="w-[2.6vh] h-[2.6vh] rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <span className="text-white text-[1.4vh] font-bold">✓</span>
              </div>
              <p className="font-body text-[1.8vw] text-white/90">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
