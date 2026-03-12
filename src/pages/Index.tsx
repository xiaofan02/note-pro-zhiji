import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeatureSection from "@/components/FeatureSection";
import Footer from "@/components/Footer";

import featureVoice from "@/assets/feature-voice.png";
import featureOrganize from "@/assets/feature-organize.png";
import featureSearch from "@/assets/feature-search.png";
import featureAi from "@/assets/feature-ai.png";
import featureSync from "@/assets/feature-sync.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />

      <FeatureSection
        image={featureVoice}
        alt="语音识别功能"
        variant="gray"
        title={
          <>
            有想法？
            <br />
            打开Get笔记，直接说出来
          </>
        }
        description="智能识别粤语、上海话、四川话等27种方言，无论你说什么语言，AI都能准确转化为文字笔记。边说边记，灵感不再溜走。"
      />

      <FeatureSection
        image={featureOrganize}
        alt="智能整理功能"
        variant="white"
        reverse
        title={
          <>
            说完就整理好了
            <br />
            AI自动结构化你的笔记
          </>
        }
        description="告别手动整理。AI自动识别你的笔记内容，提取关键信息，生成标题、标签和摘要，让每一条笔记都井井有条，随时可用。"
      />

      <FeatureSection
        image={featureSearch}
        alt="AI搜索功能"
        variant="gray"
        title={
          <>
            记了就能找到
            <br />
            AI帮你精准定位每条笔记
          </>
        }
        description="不记得关键词也没关系。用自然语言描述你想找的内容，AI就能帮你从海量笔记中快速找到。支持语义搜索、模糊匹配，让知识触手可及。"
      />

      <FeatureSection
        image={featureAi}
        alt="AI总结与思维导图"
        variant="white"
        reverse
        title={
          <>
            一键总结，一键导图
            <br />
            让笔记真正为你所用
          </>
        }
        description="AI自动生成笔记摘要和思维导图，帮你快速回顾核心要点。无论是会议记录、读书笔记还是灵感碎片，都能变成结构化的知识体系。"
      />

      <FeatureSection
        image={featureSync}
        alt="多端同步功能"
        variant="gray"
        title={
          <>
            随时随地，无缝衔接
            <br />
            多端实时同步你的笔记
          </>
        }
        description="手机上随口一记，电脑上继续编辑。支持 iOS、Android、Web 多端同步，你的笔记永远在身边，随时查阅和整理。"
      />

      <Footer />
    </div>
  );
};

export default Index;
