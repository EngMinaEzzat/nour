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
    <div className="px-6 py-8" style={{ background: "var(--bg-main, #faf7f4)" }}>
      <h3
        className="text-center text-lg font-semibold mb-6"
        style={{ fontFamily: "var(--font-heading, 'Cormorant Garamond', serif)", color: "var(--text-heading, #1c1917)" }}
      >
        {section.content.heading as string}
      </h3>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {displayItems.map((item, i) => {
          const bgStyle = !item.imageUrl
            ? { background: `${i % 2 === 0 ? p : sec}${15 + i * 5}`, borderRadius: "var(--card-radius, 8px)" }
            : { borderRadius: "var(--card-radius, 8px)" };
          return (
            <div
              key={i}
              className="aspect-square bg-stone-100 overflow-hidden relative"
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
