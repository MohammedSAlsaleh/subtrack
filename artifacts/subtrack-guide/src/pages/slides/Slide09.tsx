const base = import.meta.env.BASE_URL;

export default function Slide09() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-0 left-0 w-full h-[1vh] bg-primary" />
      <div className="absolute -top-[18vh] -right-[10vw] w-[32vw] h-[32vw] rounded-full bg-primary/5" />
      <div className="relative h-full flex items-center px-[6vw] gap-[5vw]">
        <div className="shrink-0">
          <div className="h-[80vh] aspect-[402/874] rounded-[2vw] border-[0.5vh] border-text/10 bg-white shadow-xl overflow-hidden">
            <img
              src={`${base}screens/settings.png`}
              crossOrigin="anonymous"
              className="w-full h-full object-cover"
              alt="Settings screen"
            />
          </div>
        </div>
        <div className="flex-1">
          <p className="font-body text-[1.5vw] font-semibold tracking-[0.25em] uppercase text-primary mb-[2vh]">
            Step 8 · Make It Yours
          </p>
          <h2 className="font-display font-bold text-[3.4vw] leading-tight tracking-tight text-text [text-wrap:balance]">
            Settings &amp; Personalization
          </h2>
          <p className="font-body text-[1.9vw] text-muted mt-[1.8vh] mb-[4vh]">
            Tailor SubTrack to the way you work.
          </p>
          <div className="flex flex-col gap-[2.4vh]">
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">1</div>
              <p className="font-body text-[1.7vw] leading-snug text-text [text-wrap:pretty]">
                Connect your bank account for automatic transaction detection
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">2</div>
              <p className="font-body text-[1.7vw] leading-snug text-text [text-wrap:pretty]">
                Switch between Light, Dark, or System theme
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">3</div>
              <p className="font-body text-[1.7vw] leading-snug text-text [text-wrap:pretty]">
                Change the app language between English (EN) and Arabic (ع)
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">4</div>
              <p className="font-body text-[1.7vw] leading-snug text-text [text-wrap:pretty]">
                Set your monthly income for budgeting insights
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">5</div>
              <p className="font-body text-[1.7vw] leading-snug text-text [text-wrap:pretty]">
                Upgrade to SubTrack Premium for budgets, bills tracking, and the AI advisor
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
