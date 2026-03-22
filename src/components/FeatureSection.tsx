import { ReactNode } from "react";

interface FeatureSectionProps {
  id?: string;
  image: string;
  alt: string;
  variant?: "white" | "gray";
  icon?: ReactNode;
  label?: string;
  title: ReactNode;
  description: string;
  bullets?: string[];
  reverse?: boolean;
}

const FeatureSection = ({
  id,
  image,
  alt,
  variant = "white",
  icon,
  label,
  title,
  description,
  bullets,
  reverse = false,
}: FeatureSectionProps) => {
  return (
    <section id={id} className={variant === "gray" ? "bg-section-alt" : "bg-background"}>
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-32">
        <div
          className={`flex flex-col ${
            reverse ? "lg:flex-row-reverse" : "lg:flex-row"
          } items-center gap-12 lg:gap-20`}
        >
          <div className="flex-1 space-y-5">
            {(icon || label) && (
              <div className="flex items-center gap-2">
                {icon}
                {label && (
                  <span className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
                    {label}
                  </span>
                )}
              </div>
            )}
            <div className="text-3xl md:text-4xl lg:text-[2.5rem] font-bold text-foreground leading-snug">
              {title}
            </div>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              {description}
            </p>
            {bullets && bullets.length > 0 && (
              <ul className="space-y-3 pt-2">
                {bullets.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm md:text-base text-muted-foreground">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex-1">
            <img
              src={image}
              alt={alt}
              className="w-full rounded-2xl shadow-[0_8px_30px_-8px_hsl(220_20%_14%/0.1)] ring-1 ring-border"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;
