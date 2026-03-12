import heroIllustration from "@/assets/hero-illustration.png";

const HeroSection = () => {
  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
        <div className="flex-1 space-y-6">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight text-foreground tracking-tight">
            你只管说，
            <br />
            AI让你的笔记
            <br />
            好记，好找，好用
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            Get 笔记，一款 AI 驱动的知识管理产品
          </p>
          <div className="flex items-center gap-4 pt-4">
            <div className="w-24 h-24 bg-muted rounded-xl flex items-center justify-center border border-border">
              <div className="text-xs text-muted-foreground text-center">QR Code</div>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>扫描二维码，即刻体验</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex justify-center">
          <img
            src={heroIllustration}
            alt="AI笔记插画"
            className="w-full max-w-lg"
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
