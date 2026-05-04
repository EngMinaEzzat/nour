import { useState } from "react";
import { X } from "lucide-react";

const MESSAGES = [
  "✦ شحن مجاني على الطلبات فوق 999 ج.م",
  "✦ منتجات أصيلة 100% • Free shipping on orders over 999 EGP",
  "✦ وصلت أحدث تشكيلات الصيف",
  "✦ إرجاع مجاني خلال 14 يوم",
  "✦ New summer arrivals — Shop now",
  "✦ دفع آمن • Fast & secure checkout",
];

const SERIF = "'Cormorant Garamond', Georgia, serif";

export function AnnouncementBar({
  p = "#8B1A35",
  onDismiss,
}: {
  p?: string;
  onDismiss?: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const text = MESSAGES.join("     •     ");

  function handleDismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  return (
    <div
      className="relative overflow-hidden flex items-center"
      style={{ background: p, height: 36, zIndex: 52 }}
    >
      <div className="flex-1 overflow-hidden">
        <div
          style={{
            display: "inline-block",
            whiteSpace: "nowrap",
            animation: "nour-marquee 40s linear infinite",
            fontFamily: SERIF,
            fontSize: 12,
            letterSpacing: "0.04em",
            color: "rgba(255,255,255,0.92)",
            paddingRight: "3rem",
          }}
        >
          {text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{text}
        </div>
      </div>

      <button
        onClick={handleDismiss}
        className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="إغلاق الإعلان"
      >
        <X className="w-3 h-3 text-white" />
      </button>

      <style>{`
        @keyframes nour-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
