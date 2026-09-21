const base = import.meta.env.BASE_URL;

export default function Slide07() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-0 left-0 w-full h-[1vh] bg-primary" />
      <div className="absolute -top-[15vh] -left-[10vw] w-[30vw] h-[30vw] rounded-full bg-accent/5" />
      <div className="relative h-full flex items-center px-[6vw] gap-[5vw]">
        <div className="shrink-0">
          <div className="h-[80vh] aspect-[402/874] rounded-[2vw] border-[0.5vh] border-text/10 bg-white shadow-xl overflow-hidden">
            <img
              src={`${base}screens/analytics.png`}
              crossOrigin="anonymous"
              className="w-full h-full object-cover"
              alt="Analytics screen"
            />
          </div>
        </div>
        <div className="flex-1">
          <p className="font-body text-[1.5vw] font-semibold tracking-[0.25em] uppercase text-primary mb-[2vh]">
            Step 6 · Insights
          </p>
          <h2 className="font-display font-bold text-[3.4vw] leading-tight tracking-tight text-text [text-wrap:balance]">
            Understanding Your Spending
          </h2>
          <p className="font-body text-[1.9vw] text-muted mt-[1.8vh] mb-[4.5vh]">
            Know exactly where your money goes each month.
          </p>
          <div className="flex flex-col gap-[3vh]">
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">1</div>
              <p className="font-body text-[1.75vw] leading-snug text-text [text-wrap:pretty]">
                Tap <span className="font-semibold text-primary">Analytics</span> from the nav menu, or tap › next to your total on the Dashboard
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">2</div>
              <p className="font-body text-[1.75vw] leading-snug text-text [text-wrap:pretty]">
                See spending broken down by category (Streaming, Software, Bills, etc.)
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">3</div>
              <p className="font-body text-[1.75vw] leading-snug text-text [text-wrap:pretty]">
                Compare month-over-month trends and your <span className="font-semibold text-primary">income vs. spending ratio</span>
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">4</div>
              <p className="font-body text-[1.75vw] leading-snug text-text [text-wrap:pretty]">
                Identify your highest-cost category — shown on the Dashboard for subscriptions, bills, and loans
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
