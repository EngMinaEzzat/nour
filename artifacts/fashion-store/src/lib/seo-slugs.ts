export function slugPart(value: string | null | undefined): string {
  const slug = (value || "item")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

  return slug || "item";
}

export function publicEntitySlug(id: number, name: string | null | undefined): string {
  return `${id}-${slugPart(name)}`;
}

export function idFromPublicSlug(value: string | null | undefined): number {
  const match = value?.match(/^(\d+)/);
  return match ? Number(match[1]) : 0;
}
