import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CtaSection = () => {
  const navigate = useNavigate();
  return (
    <section className="bg-background">
      <div className="max-w-4xl mx-auto px-6 py-20 md:py-28 text-center space-y-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-foreground">
          <Sparkles className="w-7 h-7 text-primary-foreground" />
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-foreground leading-tight">
          准备好让 AI<br />帮你管理知识了吗？
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          加入 10 万+ 用户，体验更聪明的笔记方式。免费开始，无需信用卡。
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="px-8 py-3.5 text-base font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity shadow-lg flex items-center gap-2">
            免费开始使用 <ArrowRight className="w-4 h-4" />
          </button>
          <button className="px-8 py-3.5 text-base font-semibold border border-border text-foreground rounded-full hover:bg-muted transition-colors">
            查看定价方案
          </button>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;
