import { PreviewSectionProps } from "./types";

export function TestimonialsPreview({ section, wrap }: PreviewSectionProps) {
  const items = (section.content.items ?? []) as Array<{
    name: string;
    text: string;
    rating: string;
  }>;
  return wrap(
    <div className="px-6 py-8" style={{ background: "var(--bg-main, #faf7f4)" }}>
      <h3
        className="text-center text-lg font-semibold mb-6"
        style={{ fontFamily: "var(--font-heading, 'Cormorant Garamond', serif)", color: "var(--text-heading, #1c1917)" }}
      >
        {section.content.heading}
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {items.slice(0, 3).map((item, i) => (
          <div key={i} className="p-3 shadow-sm" style={{ background: "var(--bg-card, #fff)", borderRadius: "var(--card-radius, 12px)", borderColor: "var(--border-color, #e5e7eb)", borderStyle: "solid", borderWidth: 1 }}>
            <div className="flex gap-0.5 mb-2">
              {Array.from({ length: parseInt(item.rating ?? "5") }).map(
                (_, j) => (
                  <span key={j} className="text-yellow-400 text-xs">
                    ★
                  </span>
                ),
              )}
            </div>
            <p className="text-[10px] mb-2 line-clamp-3" style={{ color: "var(--text-body, #78716c)", fontFamily: "var(--font-body)" }}>
              {item.text}
            </p>
            <p className="text-[10px] font-semibold" style={{ color: "var(--text-heading, #1c1917)", fontFamily: "var(--font-body)" }}>
              {item.name}
            </p>
          </div>
        ))}
      </div>
    </div>,
  );
}
