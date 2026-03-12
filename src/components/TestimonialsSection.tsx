import { MessageSquare, Star } from "lucide-react";

const testimonials = [
  {
    name: "李明",
    role: "产品经理",
    content: "以前开会都要手忙脚乱地记笔记，现在用智记 AI 直接录音，会后就能拿到整理好的会议纪要，太省心了。",
    rating: 5,
  },
  {
    name: "张小雨",
    role: "自由撰稿人",
    content: "走路的时候突然有灵感，掏出手机说两句就自动变成结构化的笔记。再也不怕灵感跑掉了。",
    rating: 5,
  },
  {
    name: "王晓",
    role: "研究生",
    content: "论文研究需要整理大量文献笔记，AI 自动帮我归类和生成思维导图，效率提升了不止一个档次。",
    rating: 5,
  },
];

const TestimonialsSection = () => {
  return (
    <section className="bg-section-alt">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background text-sm text-muted-foreground">
            <MessageSquare className="w-3.5 h-3.5" />
            用户评价
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            他们都在用智记 AI
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            来自各行各业的用户分享他们的真实体验
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="bg-background rounded-2xl p-6 shadow-sm border border-border space-y-4"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-foreground text-foreground" />
                ))}
              </div>
              <p className="text-foreground leading-relaxed">"{t.content}"</p>
              <div className="pt-2 border-t border-border">
                <div className="font-semibold text-foreground">{t.name}</div>
                <div className="text-sm text-muted-foreground">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
