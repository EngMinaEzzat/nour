import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Link2 } from "lucide-react";
import { getCsrfToken } from "@workspace/api-client-react";
import { normalizeStoredImageUrl, productImageUrl } from "@/lib/image-url";
import { t } from "i18next";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const MAX_IMAGE_SIZE_MB = 20;
const MAX_IMAGE_SIZE = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp";
const SUPPORTED_IMAGE_FORMATS = "JPG, PNG, WebP, GIF, AVIF, BMP";
const NORMALIZED_MIMES = new Set(["image/avif", "image/bmp"]);

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;

  label?: string;
  className?: string;
}

async function uploadImage(file: File) {
  const { t } = await import("i18next");
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(t("imageUpload.errorSize", { max: MAX_IMAGE_SIZE_MB }));
  }
  if (file.type && !IMAGE_ACCEPT.split(",").includes(file.type)) {
    throw new Error(t("imageUpload.errorFormat", { formats: SUPPORTED_IMAGE_FORMATS }));
  }

  const fileToUpload = await normalizeUploadFile(file);
  const formData = new FormData();
  formData.append("image", fileToUpload);
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
  if (!res.ok || !data.url) throw new Error(data.error ?? t("imageUpload.errorGeneric"));
  return data.url;
}

async function normalizeUploadFile(file: File) {
  if (!NORMALIZED_MIMES.has(file.type)) return file;

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image");
    ctx.drawImage(image, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) throw new Error("تعذر تحويل الصورة لصيغة مناسبة للموبايل");
    const safeName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${safeName}.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ImageUpload({ value, onChange, label, className }: ImageUploadProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      onChange(normalizeStoredImageUrl(await uploadImage(file)));
      setMode("url");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("imageUpload.errorGeneric"));
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
          <Link2 className="w-3 h-3" /> {t("imageUpload.url")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "upload" ? "default" : "outline"}
          className="rounded-full gap-1.5 h-7 text-xs px-3"
          onClick={() => setMode("upload")}
        >
          <Upload className="w-3 h-3" /> {t("imageUpload.upload")}
        </Button>
      </div>

      {mode === "url" ? (
        <Input
          value={value}
          onChange={(e) => onChange(normalizeStoredImageUrl(e.target.value))}
          placeholder={t("imageUpload.urlPlaceholder")}
          dir="ltr"
          className="h-10 text-sm"
        />
      ) : (
        <label
          htmlFor={inputId}
          className="block border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2"
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
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          {uploading ? (
            <div className="py-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">{t("imageUpload.uploading")}</p>
            </div>
          ) : (
            <div className="py-3">
              <Upload className="w-7 h-7 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">{t("imageUpload.dropHere")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("imageUpload.supported", { formats: SUPPORTED_IMAGE_FORMATS, max: MAX_IMAGE_SIZE_MB })}</p>
            </div>
          )}
        </label>
      )}

      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}

      {value && (
        <div className="relative mt-2 inline-block">
          <img
            src={productImageUrl(value)}
            alt="معاينة"
            className="h-20 w-20 object-contain rounded-xl border border-border bg-background p-1 shadow-sm"
          />
          <button
            type="button"
            className="absolute -top-1.5 -end-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center hover:opacity-90 transition-opacity"
            onClick={() => onChange("")}
            aria-label={t("imageUpload.removeImage")}
            title={t("imageUpload.removeImage")}
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
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
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
      for (const file of files) uploaded.push(normalizeStoredImageUrl(await uploadImage(file)));
      onChange([...values, ...uploaded]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("imageUpload.errorGeneric"));
    } finally {
      setUploading(false);
    }
  }

  function addUrl() {
    const url = urlInput.trim();
    if (!url) return;
    const normalized = normalizeStoredImageUrl(url);
    if (!values.includes(normalized)) onChange([...values, normalized]);
    setUrlInput("");
    setError(null);
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
            {uploading ? t("imageUpload.uploading") : t("imageUpload.upload")}
          </Button>
          <label htmlFor={inputId} className="text-xs text-muted-foreground cursor-pointer">
            {t("imageUpload.supported", { formats: SUPPORTED_IMAGE_FORMATS, max: MAX_IMAGE_SIZE_MB })}
          </label>
        </div>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrl();
              }
            }}
            placeholder={t("imageUpload.urlPlaceholder")}
            dir="ltr"
            className="h-8 text-xs sm:w-auto"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs sm:w-auto"
            onClick={addUrl}
          >
            <Link2 className="w-3 h-3" />
            {t("imageUpload.url")}
          </Button>
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
                  src={productImageUrl(url)}
                  alt="معاينة"
                  className="h-20 w-20 object-contain rounded-lg border border-border bg-background p-1 shadow-sm"
                />
                <button
                  type="button"
                  className="absolute -top-1.5 -end-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center hover:opacity-90 transition-opacity"
                  onClick={() => onChange(values.filter((_, index) => index !== i))}
                  aria-label={t("imageUpload.removeImage")}
                  title={t("imageUpload.removeImage")}
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
