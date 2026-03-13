import heroArt from "@/assets/hero-art.png";
import { ArrowDown, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();
  const handleCta = () => navigate("/workspace");
  return (
    <section className="pt-28 pb-20 px-6">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5" />
            AI 驱动 · 全新笔记体验
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-[4.2rem] font-black leading-[1.15] text-foreground tracking-tight">
            开口就能记，
            <br />
            AI 帮你把知识
            <br />
            <span className="relative">
              管好、用好
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                <path d="M2 8C50 2 150 2 298 8" stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinecap="round" opacity="0.2"/>
              </svg>
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed">
            智记 AI — 你的私人知识管理助手。用声音捕捉灵感，让 AI 自动整理、归纳和连接你的每一条笔记。
          </p>
          <div className="flex flex-col sm:flex-row items-start gap-4 pt-4">
            <button onClick={handleCta} className="px-8 py-3.5 text-base font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity shadow-lg">
              立即免费体验
            </button>
            <button className="px-8 py-3.5 text-base font-semibold border border-border text-foreground rounded-full hover:bg-muted transition-colors flex items-center gap-2">
              了解更多 <ArrowDown className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              支持 iOS / Android / Web
            </div>
            <div>已有 10 万+ 用户</div>
          </div>
        </div>
        <div className="flex-1 flex justify-center">
          <img
            src={heroArt}
            alt="AI 笔记助手插画"
            className="w-full max-w-md"
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
