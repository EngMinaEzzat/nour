import { PreviewSectionProps } from "./types";
import { normalizeStoredImageUrl } from "@/lib/image-url";

export function InstagramPreview({
  section,
  p,
  sec,
  wrap,
}: PreviewSectionProps) {
  const cols = section.settings.columns ?? 3;
  const items = (section.content.items ?? []) as Array<{ imageUrl?: string }>;
  const displayItems = Array.from({ length: cols * 2 }).map(
    (_, i) => items[i] || {},
  );
  return wrap(
    <div className="bg-white px-6 py-8">
      <h3
        className="text-center text-lg font-semibold text-stone-900 mb-6"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        {section.content.heading as string}
      </h3>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {displayItems.map((item, i) => {
          const bgStyle = !item.imageUrl
            ? { background: `${i % 2 === 0 ? p : sec}${15 + i * 5}` }
            : {};
          return (
            <div
              key={i}
              className="aspect-square rounded-lg bg-stone-100 overflow-hidden relative"
              style={bgStyle}
            >
              {item.imageUrl && (
                <img
                  src={normalizeStoredImageUrl(item.imageUrl)}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>,
  );
}
