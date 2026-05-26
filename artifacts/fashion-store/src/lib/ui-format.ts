export function localeForLanguage(language?: string) {
  return language === "ar" ? "ar-EG" : "en-US";
}

export function currencyForLanguage(language?: string) {
  return language === "ar" ? "ج.م" : "EGP";
}

export function formatCurrency(value: number | string | null | undefined, language?: string) {
  const amount = Number(value ?? 0);
  return `${amount.toLocaleString(localeForLanguage(language), { maximumFractionDigits: 2 })} ${currencyForLanguage(language)}`;
}

export function formatRelativeAge(dateValue: string | Date | null | undefined, language?: string) {
  if (!dateValue) return language === "ar" ? "غير محدد" : "Unknown";

  const timestamp = new Date(dateValue).getTime();
  if (Number.isNaN(timestamp)) return language === "ar" ? "غير محدد" : "Unknown";

  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 60) {
    return language === "ar" ? `منذ ${minutes || 1} د` : `${minutes || 1}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return language === "ar" ? `منذ ${hours} س` : `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return language === "ar" ? `منذ ${days} يوم` : `${days}d ago`;
}
