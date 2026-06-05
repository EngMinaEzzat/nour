import { PreviewSectionProps } from "./types";

export function TestimonialsPreview({ section, wrap }: PreviewSectionProps) {
  const items = (section.content.items ?? []) as Array<{
    name: string;
    text: string;
    rating: string;
  }>;
  return wrap(
    <div className="bg-[#faf7f4] px-6 py-8">
      <h3
        className="text-center text-lg font-semibold text-stone-900 mb-6"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        {section.content.heading}
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {items.slice(0, 3).map((item, i) => (
          <div key={i} className="bg-white p-3 rounded-xl shadow-sm">
            <div className="flex gap-0.5 mb-2">
              {Array.from({ length: parseInt(item.rating ?? "5") }).map(
                (_, j) => (
                  <span key={j} className="text-yellow-400 text-xs">
                    ★
                  </span>
                ),
              )}
            </div>
            <p className="text-[10px] text-stone-600 mb-2 line-clamp-3">
              {item.text}
            </p>
            <p className="text-[10px] font-semibold text-stone-800">
              {item.name}
            </p>
          </div>
        ))}
      </div>
    </div>,
  );
}
