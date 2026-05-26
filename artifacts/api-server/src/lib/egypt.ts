/**
 * Egyptian-specific utilities
 * ─────────────────────────────────────────────────────────────────────
 * - Egyptian mobile phone validation (01xxxxxxxxx / +201xxxxxxxxx)
 * - EGP currency formatting (Arabic locale)
 * - Complete list of all 27 Egyptian governorates (ar + en)
 */

// ─── Phone ──────────────────────────────────────────────────────────────────

/**
 * Normalise an Egyptian mobile number to E.164 (+201XXXXXXXXX).
 * Returns null if the number is not a valid Egyptian mobile.
 *
 * Accepted forms:
 *   01XXXXXXXXX  (11 digits, starts with 010/011/012/015)
 *   +201XXXXXXXX (13 chars)
 *   00201XXXXXXX (13 chars)
 */
export function normaliseEgyptianPhone(raw: string): string | null {
  const asciiDigits = raw
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
  const cleaned = asciiDigits.replace(/[\s\-().]/g, "");

  let local: string | null = null;

  if (/^\+20(1[0125]\d{8})$/.test(cleaned)) {
    local = cleaned.slice(3);
  } else if (/^0020(1[0125]\d{8})$/.test(cleaned)) {
    local = cleaned.slice(4);
  } else if (/^(1[0125]\d{8})$/.test(cleaned)) {
    local = cleaned;
  } else if (/^0(1[0125]\d{8})$/.test(cleaned)) {
    local = cleaned.slice(1);
  }

  if (!local) return null;
  return `+20${local}`;
}

/**
 * Returns true if the given string is a valid Egyptian mobile number.
 */
export function isValidEgyptianPhone(raw: string): boolean {
  return normaliseEgyptianPhone(raw) !== null;
}

/**
 * User-facing Arabic validation message for phone fields.
 */
export const PHONE_ERROR_AR =
  "رقم الهاتف غير صحيح — يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015";

// ─── Currency ────────────────────────────────────────────────────────────────

const egpFormatter = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a number as EGP in Arabic locale.
 * e.g.  1234.5  →  "١٬٢٣٤٫٥٠ ج.م."
 */
export function formatEGP(amount: number): string {
  return egpFormatter.format(amount);
}

// ─── Governorates ────────────────────────────────────────────────────────────

export interface Governorate {
  /** Arabic name shown in the UI */
  nameAr: string;
  /** English slug used in shipping-zone records */
  nameEn: string;
  /** ISO 3166-2:EG code */
  code: string;
  /** Geographic region for grouping */
  region: "cairo" | "delta" | "upper" | "canal" | "sinai" | "red_sea" | "western" | "frontier";
}

export const EGYPT_GOVERNORATES: Governorate[] = [
  // Cairo & surroundings
  { nameAr: "القاهرة",     nameEn: "Cairo",            code: "EG-C",   region: "cairo" },
  { nameAr: "الجيزة",      nameEn: "Giza",             code: "EG-GZ",  region: "cairo" },
  { nameAr: "القليوبية",   nameEn: "Qalyubia",         code: "EG-KB",  region: "cairo" },
  // Delta
  { nameAr: "الإسكندرية", nameEn: "Alexandria",        code: "EG-ALX", region: "delta" },
  { nameAr: "البحيرة",     nameEn: "Beheira",          code: "EG-BH",  region: "delta" },
  { nameAr: "الغربية",     nameEn: "Gharbia",          code: "EG-GH",  region: "delta" },
  { nameAr: "المنوفية",    nameEn: "Monufia",          code: "EG-MNF", region: "delta" },
  { nameAr: "الدقهلية",   nameEn: "Dakahlia",          code: "EG-DK",  region: "delta" },
  { nameAr: "الشرقية",     nameEn: "Sharqia",          code: "EG-SHR", region: "delta" },
  { nameAr: "كفر الشيخ",  nameEn: "Kafr el-Sheikh",   code: "EG-KFS", region: "delta" },
  { nameAr: "دمياط",       nameEn: "Damietta",         code: "EG-DT",  region: "delta" },
  // Canal
  { nameAr: "بورسعيد",    nameEn: "Port Said",         code: "EG-PTS", region: "canal" },
  { nameAr: "الإسماعيلية",nameEn: "Ismailia",         code: "EG-IS",  region: "canal" },
  { nameAr: "السويس",      nameEn: "Suez",             code: "EG-SUZ", region: "canal" },
  // Upper Egypt
  { nameAr: "الفيوم",      nameEn: "Fayoum",           code: "EG-FYM", region: "upper" },
  { nameAr: "بني سويف",   nameEn: "Beni Suef",         code: "EG-BNS", region: "upper" },
  { nameAr: "المنيا",      nameEn: "Minya",            code: "EG-MN",  region: "upper" },
  { nameAr: "أسيوط",       nameEn: "Asyut",            code: "EG-AST", region: "upper" },
  { nameAr: "سوهاج",       nameEn: "Sohag",            code: "EG-SHG", region: "upper" },
  { nameAr: "قنا",          nameEn: "Qena",             code: "EG-KN",  region: "upper" },
  { nameAr: "الأقصر",      nameEn: "Luxor",            code: "EG-LX",  region: "upper" },
  { nameAr: "أسوان",        nameEn: "Aswan",           code: "EG-ASN", region: "upper" },
  // Sinai
  { nameAr: "شمال سيناء", nameEn: "North Sinai",       code: "EG-SIN", region: "sinai" },
  { nameAr: "جنوب سيناء", nameEn: "South Sinai",       code: "EG-JS",  region: "sinai" },
  // Red Sea & frontiers
  { nameAr: "البحر الأحمر",nameEn: "Red Sea",          code: "EG-BA",  region: "red_sea" },
  { nameAr: "مطروح",        nameEn: "Matrouh",         code: "EG-MT",  region: "western" },
  { nameAr: "الوادي الجديد",nameEn: "New Valley",     code: "EG-WAD", region: "frontier" },
];

export const GOVERNORATE_NAMES_AR = EGYPT_GOVERNORATES.map((g) => g.nameAr);
export const GOVERNORATE_NAMES_EN = EGYPT_GOVERNORATES.map((g) => g.nameEn);

/**
 * Look up a governorate by its Arabic or English name (case-insensitive).
 */
export function findGovernorate(name: string): Governorate | undefined {
  const lower = name.trim().toLowerCase();
  return EGYPT_GOVERNORATES.find(
    (g) => g.nameAr === name.trim() || g.nameEn.toLowerCase() === lower
  );
}
