import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { productImageUrl } from "@/lib/image-url";

const SERIF = "'Cormorant Garamond', Georgia, serif";

interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl?: string | null;
  categoryName?: string | null;
}

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  primaryColor: string;
}

export function SearchOverlay({
  open,
  onClose,
  products,
  primaryColor: p,
}: SearchOverlayProps) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const results =
    q.trim().length > 0
      ? products.filter(pr =>
          pr.name.toLowerCase().includes(q.toLowerCase())
        ).slice(0, 8)
      : [];

  const SUGGESTIONS = ["فستان", "كريم بشرة", "حقيبة", "سيروم", "كوتشي", "عطر"];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            background: "rgba(250,247,244,0.97)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            direction: "rtl",
          }}
        >
          {/* Search bar */}
          <div
            className="flex items-center gap-4 px-5 sm:px-10 h-20 border-b"
            style={{ borderColor: "rgba(139,26,53,0.08)" }}
          >
            <Search className="w-5 h-5 shrink-0" style={{ color: p }} />
            <input
              ref={inputRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="ابحثي عن منتج، فئة أو ماركة..."
              className="flex-1 bg-transparent outline-none text-lg font-medium text-stone-800 placeholder:text-stone-300"
              style={{ fontFamily: SERIF, fontSize: "1.2rem" }}
            />
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-10 py-8">
            {q.trim().length === 0 ? (
              <div className="max-w-xl mx-auto">
                <p className="text-[11px] tracking-widest uppercase text-stone-400 mb-4 font-medium">
                  اقتراحات
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => setQ(s)}
                      className="px-4 py-2 rounded-full text-sm border transition-all hover:border-stone-300 hover:text-stone-800"
                      style={{
                        borderColor: "rgba(0,0,0,0.1)",
                        color: "#7a6060",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center mt-20">
                <p className="text-stone-400 text-sm">
                  لا توجد نتائج لـ{" "}
                  <span className="font-semibold text-stone-700">"{q}"</span>
                </p>
              </div>
            ) : (
              <div className="max-w-xl mx-auto flex flex-col gap-2">
                <p className="text-[11px] tracking-widest uppercase text-stone-400 mb-2 font-medium">
                  {results.length} نتيجة
                </p>
                {results.map((pr, i) => (
                  <motion.button
                    key={pr.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => { onClose(); navigate(`/products/${pr.id}`); }}
                    className="flex items-center gap-4 p-3 rounded-2xl text-right transition-all hover:bg-stone-100 group"
                  >
                    <img
                      src={productImageUrl(pr.imageUrl)}
                      alt={pr.name}
                      width={56}
                      height={56}
                      loading="lazy"
                      decoding="async"
                      className="w-14 h-14 rounded-xl object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      {pr.categoryName && (
                        <p className="text-[10px] tracking-widest uppercase text-stone-400 mb-0.5">
                          {pr.categoryName}
                        </p>
                      )}
                      <p
                        className="font-medium text-stone-800 truncate text-[15px]"
                        style={{ fontFamily: SERIF }}
                      >
                        {pr.name}
                      </p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: p }}>
                        {pr.price.toLocaleString("ar-EG")} ج.م
                      </p>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-stone-300 group-hover:text-stone-500 shrink-0 transition-colors" />
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
