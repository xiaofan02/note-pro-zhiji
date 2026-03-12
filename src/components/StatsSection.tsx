import { Sparkles, Zap, Shield, Clock } from "lucide-react";

const stats = [
  { value: "27+", label: "支持方言和语言", icon: <Sparkles className="w-5 h-5" /> },
  { value: "0.5s", label: "平均响应速度", icon: <Zap className="w-5 h-5" /> },
  { value: "100%", label: "端到端加密", icon: <Shield className="w-5 h-5" /> },
  { value: "∞", label: "笔记存储空间", icon: <Clock className="w-5 h-5" /> },
];

const StatsSection = () => {
  return (
    <section className="bg-foreground">
      <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center space-y-3">
              <div className="flex justify-center text-primary-foreground opacity-60">
                {stat.icon}
              </div>
              <div className="text-3xl md:text-4xl font-black text-primary-foreground">
                {stat.value}
              </div>
              <div className="text-sm text-primary-foreground opacity-60">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
