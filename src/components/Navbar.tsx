import { Sparkles, Mic, Brain, Search, FileText, Monitor } from "lucide-react";

const Navbar = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">智记 AI</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#voice" className="hover:text-foreground transition-colors flex items-center gap-1">
            <Mic className="w-3.5 h-3.5" />语音速记
          </a>
          <a href="#organize" className="hover:text-foreground transition-colors flex items-center gap-1">
            <Brain className="w-3.5 h-3.5" />智能整理
          </a>
          <a href="#search" className="hover:text-foreground transition-colors flex items-center gap-1">
            <Search className="w-3.5 h-3.5" />AI 搜索
          </a>
          <a href="#summary" className="hover:text-foreground transition-colors flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />总结导图
          </a>
          <a href="#sync" className="hover:text-foreground transition-colors flex items-center gap-1">
            <Monitor className="w-3.5 h-3.5" />多端同步
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm font-medium border border-border rounded-full text-foreground hover:bg-muted transition-colors">
            注册/登录
          </button>
          <button className="px-4 py-2 text-sm font-medium bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity">
            免费下载
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
