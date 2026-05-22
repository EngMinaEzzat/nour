import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getBaseDomain(): string {
  if (typeof window === "undefined") return "nour.eg";
  const hostname = window.location.hostname;
  
  // Support local development
  if (hostname.endsWith(".localhost") || hostname === "localhost") {
    return "localhost";
  }
  
  // Replace this with any staging/dev domain as needed, default to production domain
  return "nour.eg";
}

export function getStoreUrl(slug: string): string {
  if (typeof window === "undefined") return `https://${slug}.nour.eg`;
  const baseDomain = getBaseDomain();
  const port = window.location.port ? `:${window.location.port}` : "";
  const protocol = window.location.protocol;
  return `${protocol}//${slug}.${baseDomain}${port}`;
}
