const base = import.meta.env.BASE_URL;

export default function Slide08() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-0 left-0 w-full h-[1vh] bg-primary" />
      <div className="absolute -bottom-[18vh] -left-[9vw] w-[32vw] h-[32vw] rounded-full bg-primary/5" />
      <div className="relative h-full flex items-center px-[6vw] gap-[5vw]">
        <div className="flex-1">
          <p className="font-body text-[1.5vw] font-semibold tracking-[0.25em] uppercase text-primary mb-[2vh]">
            Step 7 · Plan Ahead
          </p>
          <h2 className="font-display font-bold text-[3.4vw] leading-tight tracking-tight text-text [text-wrap:balance]">
            Savings Goals &amp; Loans
          </h2>
          <p className="font-body text-[1.9vw] text-muted mt-[1.8vh] mb-[4.5vh]">
            Plan ahead and manage debt — all in one app.
          </p>
          <div className="flex flex-col gap-[3vh]">
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">1</div>
              <p className="font-body text-[1.75vw] leading-snug text-text [text-wrap:pretty]">
                <span className="font-semibold text-primary">Goals:</span> set a target amount, pick a Gregorian or <span className="font-semibold">Hijri deadline</span>, and use built-in presets like Hajj fund
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">2</div>
              <p className="font-body text-[1.75vw] leading-snug text-text [text-wrap:pretty]">
                Contribute to a goal directly from the Dashboard — no need to open the Goals screen
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">3</div>
              <p className="font-body text-[1.75vw] leading-snug text-text [text-wrap:pretty]">
                <span className="font-semibold text-primary">Loans:</span> add car loans, personal loans, credit cards, or BNPL plans — each tracked separately with its trial end date shown clearly
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">4</div>
              <p className="font-body text-[1.75vw] leading-snug text-text [text-wrap:pretty]">
                Use the <span className="font-semibold">Payoff Simulator</span> to see how extra payments cut your payoff date — then share the plan directly from the app
              </p>
            </div>
          </div>
        </div>
        <div className="shrink-0">
          <div className="h-[80vh] aspect-[402/874] rounded-[2vw] border-[0.5vh] border-text/10 bg-white shadow-xl overflow-hidden">
            <img
              src={`${base}screens/goals.png`}
              crossOrigin="anonymous"
              className="w-full h-full object-cover"
              alt="Savings goals screen"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
