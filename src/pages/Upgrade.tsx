import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Crown, Sparkles, Zap, MessageSquare, Mic, FolderSync, Brain } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const plans = [
  {
    id: "free",
    name: "免费版",
    price: "¥0",
    period: "永久免费",
    description: "基础笔记功能，适合轻度使用",
    features: [
      "无限笔记创建",
      "文件夹管理 & 标签",
      "Markdown 编辑器",
      "深色模式",
      "每日 3 次 AI 调用",
    ],
    cta: "当前方案",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro 专业版",
    price: "¥19.9",
    period: "/月",
    yearlyPrice: "¥199",
    yearlyPeriod: "/年（省 ¥39.8）",
    description: "解锁全部 AI 能力，适合深度用户",
    features: [
      "所有免费版功能",
      "无限 AI 对话助手",
      "AI 智能整理 & 摘要",
      "语音速记转文字",
      "多设备云端同步",
      "优先技术支持",
    ],
    cta: "升级 Pro",
    highlight: true,
  },
];

const Upgrade = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro } = useUserRole();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"wechat" | "alipay">("wechat");

  const handleUpgrade = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setShowPayDialog(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <Crown className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">升级方案</h1>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" /> 解锁全部 AI 能力
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
          选择适合你的方案
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          免费开始使用，随时升级解锁 AI 智能整理、对话助手、语音速记等全部高级功能
        </p>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${billingCycle === "monthly" ? "bg-foreground text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            月付
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${billingCycle === "yearly" ? "bg-foreground text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            年付
            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">省17%</span>
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-5xl mx-auto px-6 pb-16 grid md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-2xl border p-8 transition-shadow ${
              plan.highlight
                ? "border-primary bg-card shadow-lg shadow-primary/5"
                : "border-border bg-card"
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                最受欢迎
              </div>
            )}
            <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold text-foreground">
                {plan.id === "pro"
                  ? billingCycle === "yearly" ? plan.yearlyPrice : plan.price
                  : plan.price}
              </span>
              <span className="text-sm text-muted-foreground">
                {plan.id === "pro"
                  ? billingCycle === "yearly" ? plan.yearlyPeriod : plan.period
                  : plan.period}
              </span>
            </div>
            <ul className="space-y-3 mb-8">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                  <Check className={`w-4 h-4 shrink-0 ${plan.highlight ? "text-primary" : "text-muted-foreground"}`} />
                  {f}
                </li>
              ))}
            </ul>
            {plan.id === "free" ? (
              <button
                disabled
                className="w-full h-11 rounded-xl border border-border text-sm font-medium text-muted-foreground cursor-default"
              >
                {isPro ? "免费版" : "当前方案"}
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={isPro}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
              >
                {isPro ? "已是 Pro 用户 ✓" : "立即升级"}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Feature highlights */}
      <div className="bg-card border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h3 className="text-xl font-bold text-foreground text-center mb-10">Pro 版独享功能</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: MessageSquare, title: "AI 对话助手", desc: "基于笔记内容的智能问答" },
              { icon: Brain, title: "AI 整理 & 摘要", desc: "一键梳理笔记要点" },
              { icon: Mic, title: "语音速记", desc: "说话即记录，AI 自动转写" },
              { icon: FolderSync, title: "云端同步", desc: "多设备数据实时同步" },
            ].map((f) => (
              <div key={f.title} className="text-center p-6 rounded-xl bg-background border border-border">
                <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-primary/10 flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-1">{f.title}</h4>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="sm:max-w-sm">
          <div className="text-center space-y-5 py-2">
            <div>
              <h3 className="text-lg font-bold text-foreground">选择支付方式</h3>
              <p className="text-sm text-muted-foreground mt-1">
                升级到 Pro · {billingCycle === "yearly" ? "¥199/年" : "¥19.9/月"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedMethod("wechat")}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                  selectedMethod === "wechat"
                    ? "border-[#07C160] bg-[#07C160]/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#07C160">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-7.062-6.122zm-2.18 2.96c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.981.97-.981zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.981.97-.981z" />
                </svg>
                <span className="text-sm font-medium text-foreground">微信支付</span>
              </button>
              <button
                onClick={() => setSelectedMethod("alipay")}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                  selectedMethod === "alipay"
                    ? "border-[#1677FF] bg-[#1677FF]/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#1677FF">
                  <path d="M21.422 15.358c-1.834-.676-3.393-1.296-3.393-1.296s.706-1.793 1.02-3.324h-3.787v-1.23h4.59V8.58h-4.59V6.246h-2.16c-.27 0-.27.27-.27.27V8.58h-4.32v.928h4.32v1.23H8.73v.928h7.305c-.227.822-.607 1.73-.607 1.73s-3.289-1.379-5.563-.875c-1.617.36-2.879 1.438-3.035 3.06-.195 2.027 1.352 3.594 3.551 3.91 2.316.332 4.29-.563 5.578-2.27.86.504 3.156 1.56 3.156 1.56l2.307-3.293zM11.04 18.238c-2.344.19-3.633-1.07-3.633-2.27 0-1.199 1.02-2.16 2.43-2.363 1.71-.246 3.418.617 4.188 1.14-.918 2.11-2.984 3.492-2.984 3.492zM2.25 0h19.5A2.25 2.25 0 0 1 24 2.25v19.5A2.25 2.25 0 0 1 21.75 24H2.25A2.25 2.25 0 0 1 0 21.75V2.25A2.25 2.25 0 0 1 2.25 0z" />
                </svg>
                <span className="text-sm font-medium text-foreground">支付宝</span>
              </button>
            </div>

            <div className="bg-muted/60 rounded-xl p-6 space-y-3">
              <div className="w-32 h-32 mx-auto bg-background rounded-lg border border-border flex items-center justify-center">
                <div className="text-center">
                  <Zap className="w-8 h-8 mx-auto text-muted-foreground/40 mb-1" />
                  <p className="text-[10px] text-muted-foreground/60">支付二维码</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                请使用{selectedMethod === "wechat" ? "微信" : "支付宝"}扫描二维码完成支付
              </p>
            </div>

            <p className="text-[11px] text-muted-foreground">
              支付功能即将上线，敬请期待。如需提前体验 Pro，请联系客服。
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Upgrade;
