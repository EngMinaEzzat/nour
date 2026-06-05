import { PreviewSectionProps } from "./types";

export function FaqPreview({ section, wrap }: PreviewSectionProps) {
  const items = (section.content.items ?? []) as Array<{
    q: string;
    a: string;
  }>;
  return wrap(
    <div className="bg-white px-6 py-8">
      <h3
        className="text-center text-lg font-semibold text-stone-900 mb-6"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        {section.content.heading as string}
      </h3>
      <div className="space-y-2 max-w-lg mx-auto">
        {items.slice(0, 3).map((item, i) => (
          <div key={i} className="border border-stone-200 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-800">
                {item.q}
              </span>
              <span className="text-stone-400 text-sm">+</span>
            </div>
          </div>
        ))}
      </div>
    </div>,
  );
}
