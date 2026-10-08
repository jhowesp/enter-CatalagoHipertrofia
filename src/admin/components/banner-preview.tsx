import {
  BannerSlideContent,
  type BannerSlideData,
} from "@/components/banner/banner-slide-content";
import { cn } from "@/lib/utils";

/** Prévia do banner com o mesmo desenho do site, usada no painel. */
export function BannerPreview({
  data,
  className,
  showCta = true,
}: {
  data: BannerSlideData;
  className?: string;
  showCta?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-border", className)}>
      <BannerSlideContent data={data} showCta={showCta} />
    </div>
  );
}
