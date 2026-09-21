const base = import.meta.env.BASE_URL;

export default function Slide03() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-0 left-0 w-full h-[1vh] bg-primary" />
      <div className="absolute -top-[15vh] -left-[10vw] w-[30vw] h-[30vw] rounded-full bg-primary/5" />
      <div className="relative h-full flex items-center px-[6vw] gap-[5vw]">
        <div className="shrink-0">
          <div className="h-[80vh] aspect-[402/874] rounded-[2vw] border-[0.5vh] border-text/10 bg-white shadow-xl overflow-hidden">
            <img
              src={`${base}screens/dashboard.png`}
              crossOrigin="anonymous"
              className="w-full h-full object-cover"
              alt="SubTrack dashboard"
            />
          </div>
        </div>
        <div className="flex-1">
          <p className="font-body text-[1.5vw] font-semibold tracking-[0.25em] uppercase text-primary mb-[2vh]">
            Step 2 · Home Base
          </p>
          <h2 className="font-display font-bold text-[3.4vw] leading-tight tracking-tight text-text [text-wrap:balance]">
            Your Dashboard
          </h2>
          <p className="font-body text-[1.9vw] text-muted mt-[1.8vh] mb-[4.5vh]">
            Your financial command center — everything at a glance.
          </p>
          <div className="flex flex-col gap-[3vh]">
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">1</div>
              <p className="font-body text-[1.75vw] leading-snug text-text [text-wrap:pretty]">
                The purple hero card shows your <span className="font-semibold">Total Monthly Outflow</span> in SAR
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">2</div>
              <p className="font-body text-[1.75vw] leading-snug text-text [text-wrap:pretty]">
                Tap the › arrow next to the amount to open detailed Analytics
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">3</div>
              <p className="font-body text-[1.75vw] leading-snug text-text [text-wrap:pretty]">
                Stats row: Active subscriptions · Due Soon · Per Year cost
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">4</div>
              <p className="font-body text-[1.75vw] leading-snug text-text [text-wrap:pretty]">
                Scroll down to see Savings Goals and Suggested Subscriptions
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
