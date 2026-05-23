import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getBaseDomain(): string {
  if (typeof window === "undefined") return "nour.eg";
  const hostname = window.location.hostname;
  
  // Support local development with localhost
  if (hostname.endsWith(".localhost") || hostname === "localhost") {
    return "localhost";
  }

  // Support local development with nip.io
  if (hostname.includes(".nip.io")) {
    const match = hostname.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\.nip\.io)$/);
    if (match) return match[1];
  }

  // Support local development using direct IP address
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return `${hostname}.nip.io`;
  }
  
  // Replace this with any staging/dev domain as needed, default to production domain
  return "nour.eg";
}

export function getStoreUrl(slug: string): string {
  if (typeof window === "undefined") return `https://${slug}.nour.eg`;
  
  const hostname = window.location.hostname;
  // If deployed to Vercel without a custom wildcard domain, use path-based routing
  if (hostname.endsWith(".vercel.app")) {
    const protocol = window.location.protocol;
    return `${protocol}//${hostname}/store/${slug}`;
  }

  const baseDomain = getBaseDomain();
  const port = window.location.port ? `:${window.location.port}` : "";
  const protocol = window.location.protocol;
  return `${protocol}//${slug}.${baseDomain}${port}`;
}
