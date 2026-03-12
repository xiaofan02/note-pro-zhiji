import { ReactNode } from "react";

interface FeatureSectionProps {
  image: string;
  alt: string;
  variant?: "white" | "gray";
  title?: ReactNode;
  description?: string;
  reverse?: boolean;
}

const FeatureSection = ({
  image,
  alt,
  variant = "white",
  title,
  description,
  reverse = false,
}: FeatureSectionProps) => {
  const hasText = title || description;

  return (
    <section className={variant === "gray" ? "bg-section-alt" : "bg-background"}>
      <div className="max-w-6xl mx-auto px-6 py-16 md:py-28">
        {hasText ? (
          <div
            className={`flex flex-col ${
              reverse ? "lg:flex-row-reverse" : "lg:flex-row"
            } items-center gap-10 lg:gap-20`}
          >
            <div className="flex-1 space-y-5">
              {title && (
                <div className="text-3xl md:text-4xl font-bold text-foreground leading-snug">
                  {title}
                </div>
              )}
              {description && (
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            <div className="flex-1">
              <img
                src={image}
                alt={alt}
                className="w-full rounded-2xl"
                loading="lazy"
              />
            </div>
          </div>
        ) : (
          <img
            src={image}
            alt={alt}
            className="w-full rounded-2xl"
            loading="lazy"
          />
        )}
      </div>
    </section>
  );
};

export default FeatureSection;
