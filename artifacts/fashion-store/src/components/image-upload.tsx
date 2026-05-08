import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Link2 } from "lucide-react";
import { getCsrfToken } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
}

export function ImageUpload({ value, onChange, label, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > 5 * 1024 * 1024) {
      setError("حجم الملف يجب أن يكون أقل من 5MB");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const headers: Record<string, string> = {};
      const csrf = getCsrfToken();
      if (csrf) headers["x-csrf-token"] = csrf;
      const res = await fetch(`${BASE}/api/uploads/image`, {
        method: "POST",
        credentials: "include",
        headers,
        body: formData,
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "فشل الرفع");
      onChange(data.url!);
      setMode("url");
    } catch (e: unknown) {
      setError((e as Error).message || "فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={className}>
      {label && <Label className="mb-1.5 block">{label}</Label>}

      <div className="flex gap-2 mb-2">
        <Button
          type="button" size="sm"
          variant={mode === "url" ? "default" : "outline"}
          className="rounded-full gap-1.5 h-7 text-xs px-3"
          onClick={() => setMode("url")}
        >
          <Link2 className="w-3 h-3" /> رابط URL
        </Button>
        <Button
          type="button" size="sm"
          variant={mode === "upload" ? "default" : "outline"}
          className="rounded-full gap-1.5 h-7 text-xs px-3"
          onClick={() => setMode("upload")}
        >
          <Upload className="w-3 h-3" /> رفع صورة
        </Button>
      </div>

      {mode === "url" ? (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com/image.jpg"
          dir="ltr"
          className="h-10 text-sm"
        />
      ) : (
        <div
          className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {uploading ? (
            <div className="py-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">جارٍ رفع الصورة...</p>
            </div>
          ) : (
            <div className="py-3">
              <Upload className="w-7 h-7 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">اضغط أو اسحب صورة هنا</p>
              <p className="text-xs text-muted-foreground mt-1">JPG · PNG · WebP — حتى 5MB</p>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}

      {value && (
        <div className="relative mt-2 inline-block">
          <img
            src={value}
            alt="معاينة"
            className="h-20 w-20 object-cover rounded-xl border border-border shadow-sm"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
          <button
            type="button"
            className="absolute -top-1.5 -end-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center hover:opacity-90 transition-opacity"
            onClick={() => onChange("")}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
