import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Link2 } from "lucide-react";
import { getCsrfToken } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const MAX_IMAGE_SIZE_MB = 20;
const MAX_IMAGE_SIZE = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
}

async function uploadImage(file: File) {
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`حجم الصورة يجب أن يكون أقل من ${MAX_IMAGE_SIZE_MB}MB`);
  }
  if (file.type && !IMAGE_ACCEPT.split(",").includes(file.type)) {
    throw new Error("الصيغ المدعومة: JPG وPNG وWebP وGIF. على iPhone اختاري JPG إذا ظهرت الصورة بصيغة HEIC.");
  }

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
  if (!res.ok || !data.url) throw new Error(data.error ?? "فشل رفع الصورة");
  return data.url;
}

export function ImageUpload({ value, onChange, label, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      onChange(await uploadImage(file));
      setMode("url");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={className}>
      {label && <Label className="mb-1.5 block">{label}</Label>}

      <div className="flex gap-2 mb-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "url" ? "default" : "outline"}
          className="rounded-full gap-1.5 h-7 text-xs px-3"
          onClick={() => setMode("url")}
        >
          <Link2 className="w-3 h-3" /> رابط URL
        </Button>
        <Button
          type="button"
          size="sm"
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
        <label
          htmlFor={inputId}
          className="block border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
        >
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          {uploading ? (
            <div className="py-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">جاري رفع الصورة...</p>
            </div>
          ) : (
            <div className="py-3">
              <Upload className="w-7 h-7 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">اضغط أو اسحب صورة هنا</p>
              <p className="text-xs text-muted-foreground mt-1">JPG · PNG · WebP · GIF حتى {MAX_IMAGE_SIZE_MB}MB بدون ضغط</p>
            </div>
          )}
        </label>
      )}

      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}

      {value && (
        <div className="relative mt-2 inline-block">
          <img
            src={value.startsWith("/") ? `${BASE}${value}` : value}
            alt="معاينة"
            className="h-20 w-20 object-cover rounded-xl border border-border shadow-sm"
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

interface ImageUploadListProps {
  values: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  className?: string;
}

export function ImageUploadList({ values, onChange, label, className }: ImageUploadListProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of files) uploaded.push(await uploadImage(file));
      onChange([...values, ...uploaded]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "فشل رفع الصور");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={className}>
      {label && <Label className="mb-1.5 block">{label}</Label>}
      <div
        className="border border-dashed border-border rounded-xl p-3"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-3 h-3" />
            {uploading ? "جاري الرفع..." : "رفع صور"}
          </Button>
          <label htmlFor={inputId} className="text-xs text-muted-foreground cursor-pointer">
            صور متعددة بجودة أصلية حتى {MAX_IMAGE_SIZE_MB}MB للصورة
          </label>
        </div>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
        {values.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {values.map((url, i) => (
              <div key={`${url}-${i}`} className="relative">
                <img
                  src={url.startsWith("/") ? `${BASE}${url}` : url}
                  alt="معاينة"
                  className="h-16 w-16 object-cover rounded-lg border border-border shadow-sm"
                />
                <button
                  type="button"
                  className="absolute -top-1.5 -end-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center hover:opacity-90 transition-opacity"
                  onClick={() => onChange(values.filter((_, index) => index !== i))}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
