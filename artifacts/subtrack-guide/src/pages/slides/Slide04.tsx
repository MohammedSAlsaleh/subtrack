const base = import.meta.env.BASE_URL;

export default function Slide04() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-0 left-0 w-full h-[1vh] bg-primary" />
      <div className="absolute -bottom-[20vh] -left-[8vw] w-[34vw] h-[34vw] rounded-full bg-accent/5" />
      <div className="relative h-full flex items-center px-[6vw] gap-[5vw]">
        <div className="flex-1">
          <p className="font-body text-[1.5vw] font-semibold tracking-[0.25em] uppercase text-primary mb-[2vh]">
            Step 3 · Getting Around
          </p>
          <h2 className="font-display font-bold text-[3.4vw] leading-tight tracking-tight text-text [text-wrap:balance]">
            Navigating the App
          </h2>
          <p className="font-body text-[1.9vw] text-muted mt-[1.8vh] mb-[4.5vh]">
            One floating button puts every section within reach.
          </p>
          <div className="flex flex-col gap-[3vh]">
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">1</div>
              <p className="font-body text-[1.75vw] leading-snug text-text [text-wrap:pretty]">
                Tap the ☰ menu button in the bottom-right corner to open navigation
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">2</div>
              <p className="font-body text-[1.75vw] leading-snug text-text [text-wrap:pretty]">
                Choose from: Dashboard · Subscriptions · Bills · Analytics · Goals · Loans · Settings
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">3</div>
              <p className="font-body text-[1.75vw] leading-snug text-text [text-wrap:pretty]">
                The active screen is highlighted in purple
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div className="w-[3.4vh] h-[3.4vh] mt-[0.3vh] rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[1.7vh] shrink-0">4</div>
              <p className="font-body text-[1.75vw] leading-snug text-text [text-wrap:pretty]">
                Tap anywhere outside the menu, or tap ✕, to close it
              </p>
            </div>
          </div>
        </div>
        <div className="shrink-0">
          <div className="h-[80vh] aspect-[402/874] rounded-[2vw] border-[0.5vh] border-text/10 bg-white shadow-xl overflow-hidden">
            <img
              src={`${base}screens/nav-menu.png`}
              crossOrigin="anonymous"
              className="w-full h-full object-cover"
              alt="Navigation menu open"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
