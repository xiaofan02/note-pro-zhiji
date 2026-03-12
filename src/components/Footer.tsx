const Footer = () => {
  return (
    <footer className="bg-background border-t border-border">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h3 className="text-xl font-bold text-foreground text-center mb-8">联系我们</h3>
        <div className="flex justify-center gap-16 mb-12">
          <div className="text-center space-y-3">
            <div className="w-28 h-28 bg-muted rounded-xl mx-auto flex items-center justify-center border border-border">
              <span className="text-xs text-muted-foreground">小红书</span>
            </div>
            <p className="text-sm text-muted-foreground">扫码关注小红书</p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-28 h-28 bg-muted rounded-xl mx-auto flex items-center justify-center border border-border">
              <span className="text-xs text-muted-foreground">服务群</span>
            </div>
            <p className="text-sm text-muted-foreground">扫码加入服务群</p>
          </div>
        </div>
        <div className="text-center space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <a href="#" className="hover:text-foreground transition-colors">隐私政策</a>
            <span>|</span>
            <a href="#" className="hover:text-foreground transition-colors">用户协议</a>
          </div>
          <p>北京思维造物信息科技股份有限公司 Copyright © 2024 All rights reserved</p>
          <p>京ICP备15037205号-10</p>
          <p>公安联网备案号：京公网安备11010502040641号</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
