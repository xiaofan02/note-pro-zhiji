import { Sparkles } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-foreground rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-foreground" />
              </div>
              <span className="text-lg font-bold text-primary-foreground">智记 AI</span>
            </div>
            <p className="text-sm text-primary-foreground opacity-50 leading-relaxed">
              AI 驱动的下一代知识管理平台，让记录和思考变得更简单。
            </p>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-primary-foreground">产品</h4>
            <ul className="space-y-2.5 text-sm text-primary-foreground opacity-50">
              <li><a href="#voice" className="hover:opacity-100 transition-opacity">语音速记</a></li>
              <li><a href="#organize" className="hover:opacity-100 transition-opacity">智能整理</a></li>
              <li><a href="#search" className="hover:opacity-100 transition-opacity">AI 搜索</a></li>
              <li><a href="#summary" className="hover:opacity-100 transition-opacity">总结导图</a></li>
              <li><a href="#sync" className="hover:opacity-100 transition-opacity">多端同步</a></li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-primary-foreground">支持</h4>
            <ul className="space-y-2.5 text-sm text-primary-foreground opacity-50">
              <li><a href="#" className="hover:opacity-100 transition-opacity">帮助中心</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">使用教程</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">功能更新</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">联系我们</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-primary-foreground">关注我们</h4>
            <ul className="space-y-2.5 text-sm text-primary-foreground opacity-50">
              <li><a href="#" className="hover:opacity-100 transition-opacity">微信公众号</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">小红书</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">微博</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">即刻</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-primary-foreground opacity-40">
            © 2024 智记 AI. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm text-primary-foreground opacity-40">
            <a href="#" className="hover:opacity-100 transition-opacity">隐私政策</a>
            <a href="#" className="hover:opacity-100 transition-opacity">用户协议</a>
            <a href="#" className="hover:opacity-100 transition-opacity">Cookie 政策</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
