const base = import.meta.env.BASE_URL;

export default function Slide05() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-0 left-0 w-full h-[1vh] bg-primary" />
      <div className="absolute -top-[18vh] -right-[10vw] w-[32vw] h-[32vw] rounded-full bg-primary/5" />
      <div className="relative h-full flex items-center px-[6vw] gap-[5vw]">
        <div className="shrink-0">
          <div className="h-[80vh] aspect-[402/874] rounded-[2vw] border-[0.5vh] border-text/10 bg-white shadow-xl overflow-hidden">
            <img
              src={`${base}screens/subscriptions.png`}
              crossOrigin="anonymous"
              className="w-full h-full object-cover"
              alt="Subscriptions screen"
            />
          </div>
        </div>
        <div className="flex-1">
          <p className="font-body text-[1.5vw] font-semibold tracking-[0.25em] uppercase text-primary mb-[2vh]">
            Step 4 · Recurring Charges
          </p>
          <h2 className="font-display font-bold text-[3.4vw] leading-tight tracking-tight text-text [text-wrap:balance]">
            Tracking Subscriptions
          </h2>
          <p className="font-body text-[1.9vw] text-muted mt-[1.8vh] mb-[4vh]">
            See every recurring charge in one place.
          </p>
          <div className="flex flex-col gap-[2.5vh]">
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">1</div>
              <p className="font-body text-[1.7vw] leading-snug text-text [text-wrap:pretty]">
                Tap <span className="font-semibold text-primary">Subscriptions</span> in the nav menu
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">2</div>
              <p className="font-body text-[1.7vw] leading-snug text-text [text-wrap:pretty]">
                View all active, paused, and trial subscriptions
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">3</div>
              <p className="font-body text-[1.7vw] leading-snug text-text [text-wrap:pretty]">
                Tap any card to see details, edit, or cancel
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">4</div>
              <p className="font-body text-[1.7vw] leading-snug text-text [text-wrap:pretty]">
                Tap + to add a new subscription manually
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">5</div>
              <p className="font-body text-[1.7vw] leading-snug text-text [text-wrap:pretty]">
                Use Suggested Subscriptions on the Dashboard to add popular services in one tap
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
