const base = import.meta.env.BASE_URL;

export default function Slide11() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-[#5B4BD5]">
      <div className="absolute inset-0 bg-gradient-to-tl from-[#6C5CE7] via-[#5B4BD5] to-[#3F2FA8]" />
      <div className="absolute -top-[22vh] -left-[10vw] w-[42vw] h-[42vw] rounded-full bg-white/5" />
      <div className="absolute -bottom-[20vh] -right-[8vw] w-[36vw] h-[36vw] rounded-full bg-white/5" />
      <div className="relative h-full flex items-center px-[6vw] gap-[5vw]">
        <div className="flex-1">
          <p className="font-body text-[1.5vw] font-semibold tracking-[0.25em] uppercase text-white/60 mb-[2.5vh]">
            SubTrack User Guide
          </p>
          <h2 className="font-display font-extrabold text-[4.8vw] leading-[1.05] tracking-tight text-white [text-wrap:balance]">
            You're All Set
          </h2>
          <p className="font-body text-[2vw] text-white/80 mt-[2.5vh] mb-[5vh]">
            Start taking control of your finances today.
          </p>
          <div className="flex flex-col gap-[2.6vh]">
            <div className="flex items-center gap-[1.1vw]">
              <div className="w-[2.8vh] h-[2.8vh] rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <span className="text-white text-[1.5vh] font-bold">✓</span>
              </div>
              <p className="font-body text-[1.8vw] text-white/90">
                Add your first subscription or connect your bank
              </p>
            </div>
            <div className="flex items-center gap-[1.1vw]">
              <div className="w-[2.8vh] h-[2.8vh] rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <span className="text-white text-[1.5vh] font-bold">✓</span>
              </div>
              <p className="font-body text-[1.8vw] text-white/90">
                Set a savings goal with a Hijri or Gregorian deadline
              </p>
            </div>
            <div className="flex items-center gap-[1.1vw]">
              <div className="w-[2.8vh] h-[2.8vh] rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <span className="text-white text-[1.5vh] font-bold">✓</span>
              </div>
              <p className="font-body text-[1.8vw] text-white/90">
                Check your Dashboard daily to stay on top of what's due
              </p>
            </div>
            <div className="flex items-center gap-[1.1vw]">
              <div className="w-[2.8vh] h-[2.8vh] rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <span className="text-white text-[1.5vh] font-bold">✓</span>
              </div>
              <p className="font-body text-[1.8vw] text-white/90">
                Ask the AI Budget Agent anything — it knows your full financial picture
              </p>
            </div>
            <div className="flex items-center gap-[1.1vw]">
              <div className="w-[2.8vh] h-[2.8vh] rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <span className="text-white text-[1.5vh] font-bold">✓</span>
              </div>
              <p className="font-body text-[1.8vw] text-white/90">
                Questions? Reach out via Settings › Support
              </p>
            </div>
          </div>
        </div>
        <div className="shrink-0">
          <div className="h-[80vh] aspect-[402/874] rounded-[2vw] border-[0.5vh] border-white/20 bg-[#0A0E1A] shadow-2xl overflow-hidden">
            <img
              src={`${base}screens/dashboard.png`}
              crossOrigin="anonymous"
              className="w-full h-full object-cover"
              alt="SubTrack dashboard"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
