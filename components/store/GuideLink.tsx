import type { Locale } from "@/lib/attune-ui/preferences/rules";
import type { Product } from "@/lib/demo/catalog";
import { guideFor } from "@/lib/demo/guides";
import { PAGE_TEXT } from "./text";

/** "Read Smartwatch Guide →", or the list of all guides when none matches this product. */
export function GuideLink({ locale, product, onOpen, className }: {
  locale: Locale;
  product: Product;
  onOpen?: (product: Product) => void;
  className?: string;
}) {
  const t = PAGE_TEXT[locale];
  const guide = guideFor(product);
  return (
    <button type="button" className={className ?? "min-h-6 text-left text-xs font-semibold text-blue-700 underline"}
      onClick={() => onOpen?.(product)}>
      {guide ? t.readGuide.replace("{x}", t[guide.topic]) : t.browseGuides} →
    </button>
  );
}
