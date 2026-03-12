interface FeatureSectionProps {
  image: string;
  alt: string;
  variant?: "white" | "gray";
}

const FeatureSection = ({ image, alt, variant = "white" }: FeatureSectionProps) => {
  return (
    <section className={variant === "gray" ? "bg-section-alt" : "bg-background"}>
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <img
          src={image}
          alt={alt}
          className="w-full rounded-2xl"
          loading="lazy"
        />
      </div>
    </section>
  );
};

export default FeatureSection;
