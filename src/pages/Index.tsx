import { Mic, Brain, Search, FileText, Monitor, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeatureSection from "@/components/FeatureSection";
import StatsSection from "@/components/StatsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import CtaSection from "@/components/CtaSection";
import Footer from "@/components/Footer";

import sectionVoice from "@/assets/section-voice.png";
import sectionOrganize from "@/assets/section-organize.png";
import sectionSearch from "@/assets/section-search.png";
import sectionSummary from "@/assets/section-summary.png";
import sectionSync from "@/assets/section-sync.png";
import sectionKnowledge from "@/assets/section-knowledge.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />

      {/* 数据亮点 */}
      <StatsSection />

      {/* 功能一：语音速记 */}
      <FeatureSection
        id="voice"
        image={sectionVoice}
        alt="语音速记功能展示"
        variant="white"
        icon={<Mic className="w-5 h-5 text-muted-foreground" />}
        label="语音速记"
        title={
          <>
            张口就能记
            <br />
            你的声音，就是最快的输入
          </>
        }
        description="走在路上、躺在床上、甚至开着车——随时随地打开智记 AI，说出你的想法，AI 自动将语音转化为结构清晰的文字笔记。"
        bullets={[
          "支持普通话、粤语、四川话、上海话等 27 种方言",
          "实时转写，延迟低于 0.5 秒",
          "自动添加标点、分段，输出即可用",
          "支持超长录音，会议、课堂、访谈一键记录",
        ]}
      />

      {/* 功能二：智能整理 */}
      <FeatureSection
        id="organize"
        image={sectionOrganize}
        alt="AI 智能整理功能展示"
        variant="gray"
        reverse
        icon={<Brain className="w-5 h-5 text-muted-foreground" />}
        label="智能整理"
        title={
          <>
            记完自动整理好
            <br />
            AI 比你更懂归类
          </>
        }
        description="再也不用手动建文件夹、打标签了。AI 理解你的笔记内容，自动生成标题、摘要和标签，并归入最合适的分类。"
        bullets={[
          "AI 自动生成标题和摘要，一目了然",
          "智能标签系统，自动关联相似内容",
          "按主题、时间、类型多维度整理",
          "支持自定义分类规则，让 AI 学习你的习惯",
        ]}
      />

      {/* 功能三：AI 搜索 */}
      <FeatureSection
        id="search"
        image={sectionSearch}
        alt="AI 语义搜索功能展示"
        variant="white"
        icon={<Search className="w-5 h-5 text-muted-foreground" />}
        label="AI 搜索"
        title={
          <>
            记了就能找到
            <br />
            用自然语言搜索你的知识
          </>
        }
        description="忘了关键词？没关系。用一句话描述你想找的内容，AI 语义搜索帮你从上千条笔记中精准定位。"
        bullets={[
          "语义理解搜索，不依赖精确关键词",
          "跨笔记关联查找，发现隐藏的知识连接",
          "搜索结果高亮显示，快速定位核心内容",
          "支持筛选条件：按时间、标签、类型过滤",
        ]}
      />

      {/* 功能四：总结与导图 */}
      <FeatureSection
        id="summary"
        image={sectionSummary}
        alt="AI 总结与思维导图功能展示"
        variant="gray"
        reverse
        icon={<FileText className="w-5 h-5 text-muted-foreground" />}
        label="总结导图"
        title={
          <>
            一键总结，一键导图
            <br />
            让笔记变成可用的知识
          </>
        }
        description="笔记不应该只是文字的堆砌。AI 自动提取核心要点，生成精炼摘要和可视化思维导图，让你的知识真正活起来。"
        bullets={[
          "AI 一键生成笔记摘要，抓住核心要点",
          "自动生成思维导图，知识结构一目了然",
          "支持多篇笔记合并总结，打通知识孤岛",
          "导出为 Markdown、PDF、图片等多种格式",
        ]}
      />

      {/* 功能五：多端同步 */}
      <FeatureSection
        id="sync"
        image={sectionSync}
        alt="多端同步功能展示"
        variant="white"
        icon={<Monitor className="w-5 h-5 text-muted-foreground" />}
        label="多端同步"
        title={
          <>
            随时随地，无缝衔接
            <br />
            你的知识库永远在身边
          </>
        }
        description="手机上灵光一闪录个语音，地铁上用平板回顾整理，回到电脑前继续深度编辑。所有设备实时同步，无缝切换。"
        bullets={[
          "支持 iOS、Android、Web、Mac、Windows 全平台",
          "云端实时同步，数据永不丢失",
          "离线模式支持，无网络也能记录",
          "端到端加密，隐私安全有保障",
        ]}
      />

      {/* 功能六：知识图谱 */}
      <FeatureSection
        id="knowledge"
        image={sectionKnowledge}
        alt="AI 知识图谱功能展示"
        variant="gray"
        reverse
        icon={<Sparkles className="w-5 h-5 text-muted-foreground" />}
        label="知识图谱"
        title={
          <>
            不只是笔记
            <br />
            构建属于你的知识网络
          </>
        }
        description="AI 自动分析笔记之间的关联，构建个人知识图谱。看见你的思维脉络，发现你从未注意到的知识连接。"
        bullets={[
          "AI 自动发现笔记间的隐藏联系",
          "可视化知识图谱，俯瞰你的知识全貌",
          "智能推荐相关笔记，激发新的灵感",
          "每周 AI 回顾报告，掌握知识增长趋势",
        ]}
      />

      {/* 用户评价 */}
      <TestimonialsSection />

      {/* CTA */}
      <CtaSection />

      {/* 页脚 */}
      <Footer />
    </div>
  );
};

export default Index;
