import { PreviewSectionProps } from "./types";

export function FaqPreview({ section, wrap }: PreviewSectionProps) {
  const items = (section.content.items ?? []) as Array<{
    q: string;
    a: string;
  }>;
  return wrap(
    <div className="px-6 py-8" style={{ background: "var(--bg-section, #fff)" }}>
      <h3
        className="text-center text-lg font-semibold mb-6"
        style={{ fontFamily: "var(--font-heading, 'Cormorant Garamond', serif)", color: "var(--text-heading, #1c1917)" }}
      >
        {section.content.heading as string}
      </h3>
      <div className="space-y-2 max-w-lg mx-auto">
        {items.slice(0, 3).map((item, i) => (
          <div key={i} className="p-3" style={{ borderColor: "var(--border-color, #e5e7eb)", borderRadius: "var(--card-radius, 12px)", background: "var(--bg-card, #fff)", borderStyle: "solid", borderWidth: 1 }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: "var(--text-heading, #1c1917)", fontFamily: "var(--font-body)" }}>
                {item.q}
              </span>
              <span className="text-sm" style={{ color: "var(--text-body, #a1a1aa)" }}>+</span>
            </div>
          </div>
        ))}
      </div>
    </div>,
  );
}
