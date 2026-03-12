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
      <FeatureSection image={featureVoice} alt="语音识别功能" variant="gray" />
      <FeatureSection image={featureOrganize} alt="智能整理功能" variant="white" />
      <FeatureSection image={featureSearch} alt="AI搜索功能" variant="gray" />
      <FeatureSection image={featureAi} alt="AI总结功能" variant="white" />
      <FeatureSection image={featureSync} alt="多端同步功能" variant="gray" />
      <Footer />
    </div>
  );
};

export default Index;
