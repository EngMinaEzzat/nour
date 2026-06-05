import { PreviewSectionProps } from "./types";

export function TrustStripPreview({ section, wrap }: PreviewSectionProps) {
  const items = (section.content.items ?? []) as Array<{
    icon: string;
    title: string;
    text: string;
  }>;
  return wrap(
    <div className="bg-stone-900 py-3 px-4">
      <div className="flex items-center justify-around gap-4 flex-wrap">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-white/80">
            <span className="text-sm">{item.icon}</span>
            <div>
              <p className="text-[10px] font-semibold text-white">
                {item.title}
              </p>
              <p className="text-[9px] opacity-60">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>,
  );
}
