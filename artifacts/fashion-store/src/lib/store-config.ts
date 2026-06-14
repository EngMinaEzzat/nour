import type { TFunction } from "i18next";
// ─── Section Types ────────────────────────────────────────────────────────────
export type SectionType =
  | "hero"
  | "new-arrivals"
  | "best-sellers"
  | "categories"
  | "testimonials"
  | "offers"
  | "about"
  | "instagram"
  | "faq"
  | "whatsapp"
  | "newsletter"
  | "lookbook"
  | "product-catalog"
  | "trust-strip";

export type PersonalityType =
  | "elegant"
  | "friendly"
  | "bold"
  | "minimal"
  | "warm"
  | "youthful"
  | "dark-glam";

export type StyleType =
  | "modern-boutique"
  | "beauty-brand"
  | "minimal-store"
  | "premium-fashion"
  | "local-brand"
  | "playful-shop"
  | "luxury-catalog"
  | "dark-glamour";

export type DeviceType = "desktop" | "tablet" | "mobile";

// ─── Section Config ───────────────────────────────────────────────────────────
export interface SectionContent {
  heading?: string;
  subheading?: string;
  ctaText?: string;
  ctaLink?: string;
  imageUrl?: string;
  body?: string;
  items?: Array<Record<string, string>>;
  [key: string]: unknown;
}

export interface SectionSettings {
  height?: "short" | "medium" | "tall" | "full";
  textAlign?: "left" | "center" | "right";
  overlayOpacity?: number;
  productCount?: number;
  cardStyle?: "grid" | "carousel";
  showPrices?: boolean;
  showQuickAdd?: boolean;
  layout?: "grid" | "carousel" | "editorial" | "with-image" | "text-only";
  showRating?: boolean;
  columns?: number;
  floatingButton?: boolean;
  [key: string]: unknown;
}

export interface SectionConfig {
  id: string;
  type: SectionType;
  label: string;
  visible: boolean;
  order: number;
  content: SectionContent;
  settings: SectionSettings;
}

// ─── Theme Config ─────────────────────────────────────────────────────────────
export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  fontPairing: "serif-sans" | "sans-sans" | "serif-serif";
  buttonStyle: "rounded" | "pill" | "square";
  radius: number;
  animationLevel: "none" | "subtle" | "lively";
  pageWidth: "contained" | "wide" | "full";
  cardShadow: "none" | "soft" | "strong";
}

// ─── Full Store Config ────────────────────────────────────────────────────────
export interface StoreConfig {
  brand: {
    name: string;
    category: string;
    targetCustomer: string;
    uniqueValue: string;
    personality: PersonalityType;
    tone: string;
    logoUrl?: string;
    coverUrl?: string;
    style?: StyleType;
  };
  theme: ThemeConfig;
  homepage: {
    sections: SectionConfig[];
  };
  business: {
    whatsapp: string;
    city: string;
    deliveryAreas: string[];
    paymentMethods: string[];
    returnPolicy: string;
    socialLinks: Record<string, string>;
  };
}

// ─── Section Label Map ────────────────────────────────────────────────────────
export const SECTION_LABELS: Record<SectionType, string> = {
  hero: "الصورة الرئيسية",
  "new-arrivals": "وصل حديثاً",
  "best-sellers": "الأكثر مبيعاً",
  categories: "الأقسام",
  testimonials: "آراء العملاء",
  offers: "عروض وخصومات",
  about: "قصة المتجر",
  instagram: "معرض الصور",
  faq: "أسئلة شائعة",
  whatsapp: "تواصل عبر واتساب",
  newsletter: "اشترك في النشرة",
  lookbook: "لوك بوك",
  "product-catalog": "جميع المنتجات",
  "trust-strip": "مميزات المتجر",
};

export const SECTION_ICONS: Record<SectionType, string> = {
  hero: "🖼️",
  "new-arrivals": "✨",
  "best-sellers": "🔥",
  categories: "📂",
  testimonials: "⭐",
  offers: "🏷️",
  about: "💬",
  instagram: "📸",
  faq: "❓",
  whatsapp: "💬",
  newsletter: "📧",
  lookbook: "🎨",
  "product-catalog": "🛍️",
  "trust-strip": "✅",
};

export const SECTION_DESCRIPTIONS: Record<SectionType, string> = {
  hero: "الصورة والنص الرئيسي في أعلى الصفحة",
  "new-arrivals": "أحدث المنتجات التي أضفتها للمتجر",
  "best-sellers": "المنتجات الأكثر مبيعاً وشعبية",
  categories: "عرض أقسام المتجر المختلفة",
  testimonials: "آراء وتقييمات عملائك",
  offers: "بانر للعروض والتخفيضات",
  about: "قصة علامتك التجارية ورؤيتها",
  instagram: "معرض صور من إنستغرام أو المنتجات",
  faq: "أسئلة متكررة يطرحها العملاء",
  whatsapp: "زر للتواصل المباشر عبر واتساب",
  newsletter: "نموذج اشتراك بالبريد الإلكتروني",
  lookbook: "معرض تحريري لصور المنتجات",
  "product-catalog": "كتالوج المنتجات الكامل مع فلترة حسب الفئة",
  "trust-strip": "شريط يوضح مزايا التسوق معك",
};

// ─── Available sections to add ────────────────────────────────────────────────
export const AVAILABLE_SECTIONS: SectionType[] = [
  "hero",
  "new-arrivals",
  "best-sellers",
  "categories",
  "trust-strip",
  "offers",
  "lookbook",
  "about",
  "testimonials",
  "instagram",
  "newsletter",
  "faq",
  "whatsapp",
  "product-catalog",
];

export function normalizeHomepageSections(
  sections: SectionConfig[] | undefined,
  storeName: string,
  category: string = "fashion",
  t?: TFunction,
  style?: StyleType,
): SectionConfig[] {
  const existing = Array.isArray(sections) ? sections : [];
  const seen = new Set<SectionType>();
  const normalized: SectionConfig[] = [];

  existing.forEach((section, index) => {
    if (!AVAILABLE_SECTIONS.includes(section.type) || seen.has(section.type)) {
      return;
    }

    seen.add(section.type);
    const defaultSection = createDefaultSection(
      section.type,
      storeName,
      category,
      t,
      style,
    );
    const content = section.content ?? {};
    const shouldBackfillLookbookItems =
      section.type === "lookbook" &&
      !Object.prototype.hasOwnProperty.call(content, "items");

    normalized.push({
      ...section,
      id: section.id || `${section.type}-${Date.now()}-${index}`,
      label: section.label || SECTION_LABELS[section.type],
      visible: section.visible ?? true,
      order: Number.isFinite(section.order) ? section.order : index,
      content: shouldBackfillLookbookItems
        ? { ...content, items: defaultSection.content.items }
        : content,
      settings: section.settings ?? {},
    });
  });

  AVAILABLE_SECTIONS.forEach((type) => {
    if (!seen.has(type)) {
      normalized.push({
        ...createDefaultSection(type, storeName, category, t, style),
        order: normalized.length,
      });
    }
  });

  const shouldPreserveExistingOrder = seen.size === AVAILABLE_SECTIONS.length;
  const orderByAvailableSections = (section: SectionConfig) =>
    AVAILABLE_SECTIONS.indexOf(section.type);

  return normalized
    .sort((a, b) =>
      shouldPreserveExistingOrder
        ? a.order - b.order
        : orderByAvailableSections(a) - orderByAvailableSections(b),
    )
    .map((section, index) => ({ ...section, order: index }));
}

// ─── Default section content factory ─────────────────────────────────────────
export function createDefaultSection(
  type: SectionType,
  storeName: string,
  category: string = "fashion",
  t?: TFunction,
  style?: StyleType,
): SectionConfig {
  const id = `${type}-${Date.now()}`;

  const isCosmetics = category === "cosmetics";
  const isDarkGlamour = style === "dark-glamour";

  const tr = (key: string, fallback: any, options?: any) => {
    if (t) {
      const res = t(key, {
        defaultValue: fallback,
        returnObjects: true,
        ...options,
      });
      return res;
    }
    return fallback;
  };

  const defaults: Record<
    SectionType,
    { content: SectionContent; settings: SectionSettings }
  > = {
    hero: {
      content: {
        heading: tr(
          isDarkGlamour
            ? "defaultSections.hero.headingDarkGlamour"
            : isCosmetics
              ? "defaultSections.hero.headingCosmetics"
              : "defaultSections.hero.heading",
          isDarkGlamour
            ? "Fierce Elegance"
            : isCosmetics
              ? `اكتشفي جمالكِ مع ${storeName}`
              : `اكتشفي أحدث تشكيلة من ${storeName}`,
          { storeName },
        ),
        subheading: tr(
          isDarkGlamour
            ? "defaultSections.hero.subheadingDarkGlamour"
            : isCosmetics
              ? "defaultSections.hero.subheadingCosmetics"
              : "defaultSections.hero.subheading",
          isDarkGlamour
            ? "Unveil the Night"
            : isCosmetics
              ? "مستحضرات عناية وتجميل تبرز جمالك الطبيعي"
              : "أزياء راقية بأسعار تناسبك",
        ),
        ctaText: tr("defaultSections.hero.ctaText", "تسوقي الآن"),
        ctaLink: "#products",
        ...(isDarkGlamour ? { imageUrl: "/hero-glamour-optimized.jpg" } : {}),
      },
      settings: { height: "tall", textAlign: "right", overlayOpacity: 40 },
    },
    "new-arrivals": {
      content: {
        heading: tr("defaultSections.newArrivals.heading", "وصل حديثاً"),
        subheading: tr(
          "defaultSections.newArrivals.subheading",
          "أحدث المنتجات في مجموعتنا",
        ),
      },
      settings: {
        productCount: 8,
        cardStyle: "grid",
        showPrices: true,
        showQuickAdd: true,
      },
    },
    "best-sellers": {
      content: {
        heading: tr("defaultSections.bestSellers.heading", "الأكثر مبيعاً"),
        subheading: tr(
          "defaultSections.bestSellers.subheading",
          "المنتجات المفضلة لعملائنا",
        ),
      },
      settings: {
        productCount: 8,
        cardStyle: "grid",
        showPrices: true,
        showQuickAdd: true,
      },
    },
    categories: {
      content: {
        heading: tr("defaultSections.categories.heading", "تسوقي حسب القسم"),
      },
      settings: { layout: "grid" },
    },
    testimonials: {
      content: {
        heading: tr(
          "defaultSections.testimonials.heading",
          "ماذا يقول عملاؤنا",
        ),
        items: [],
      },
      settings: { layout: "grid", showRating: true },
    },
    offers: {
      content: {
        promo1Label: tr("defaultSections.offers.promo1Label", "عروض حصرية"),
        promo1Heading: tr(
          "defaultSections.offers.promo1Heading",
          "خصم يصل إلى",
        ),
        promo1Discount: "40",
        promo1Desc: tr(
          "defaultSections.offers.promo1Desc",
          "على تشكيلات مختارة — لفترة محدودة",
        ),
        promo1Cta: tr("defaultSections.offers.promo1Cta", "تسوقي الآن"),
        promo2Label: tr("defaultSections.offers.promo2Label", "توصيل مجاني"),
        promo2Heading: tr("defaultSections.offers.promo2Heading", "شحن مجاني"),
        promo2Subheading: tr(
          "defaultSections.offers.promo2Subheading",
          "لكل طلب فوق",
        ),
        promo2Threshold: "999",
        promo2Cta: tr("defaultSections.offers.promo2Cta", "اطلبي الآن"),
      },
      settings: {},
    },
    about: {
      content: {
        heading: tr("defaultSections.about.heading", `قصة ${storeName}`, {
          storeName,
        }),
        body: tr(
          isCosmetics
            ? "defaultSections.about.bodyCosmetics"
            : "defaultSections.about.bodyFashion",
          isCosmetics
            ? "نؤمن بأن الجمال الحقيقي ينبع من الداخل، ومهمتنا هي توفير أفضل مستحضرات العناية والتجميل لتعزيز ثقتكِ بنفسكِ. كل منتج نختاره بعناية ليناسب احتياجاتكِ."
            : "نؤمن بأن كل امرأة تستحق أن تشعر بالثقة والأناقة. بدأنا رحلتنا بشغف حقيقي لتقديم أجمل الأزياء بأفضل الأسعار.",
        ),
        imageUrl: "/about-optimized.jpg",
      },
      settings: { layout: "with-image" },
    },
    instagram: {
      content: {
        heading: tr(
          "defaultSections.instagram.heading",
          "تابعينا على إنستغرام",
        ),
      },
      settings: { columns: 3 },
    },
    faq: {
      content: {
        heading: tr("defaultSections.faq.heading", "أسئلة شائعة"),
        items: tr("defaultSections.faq.items", [
          {
            q: "كم مدة التوصيل؟",
            a: "يصل طلبك خلال 2-5 أيام عمل داخل المحافظات الكبرى.",
          },
          {
            q: "هل يمكنني الإرجاع؟",
            a: "نعم، نقبل الإرجاع خلال 14 يوم من الاستلام.",
          },
          {
            q: "ما هي طرق الدفع المتاحة؟",
            a: "نقبل الدفع عند الاستلام، والبطاقات البنكية، وفودافون كاش.",
          },
        ]),
      },
      settings: {},
    },
    whatsapp: {
      content: {
        heading: tr("defaultSections.whatsapp.heading", "تحدثي معنا مباشرة"),
        subheading: tr(
          "defaultSections.whatsapp.subheading",
          "نرد على استفساراتك خلال دقائق",
        ),
        ctaText: tr("defaultSections.whatsapp.ctaText", "تواصلي عبر واتساب"),
      },
      settings: { floatingButton: true },
    },
    newsletter: {
      content: {
        heading: tr("defaultSections.newsletter.heading", "اشتركي في نشرتنا"),
        subheading: tr(
          "defaultSections.newsletter.subheading",
          "كوني أول من تعرف بالعروض والمنتجات الجديدة",
        ),
        ctaText: tr("defaultSections.newsletter.ctaText", "اشتركي الآن"),
      },
      settings: {},
    },
    lookbook: {
      content: {
        heading: tr(
          isDarkGlamour
            ? "defaultSections.lookbook.headingDarkGlamour"
            : "defaultSections.lookbook.heading",
          isDarkGlamour ? "Midnight Collection" : "لوك بوك - إلهامي هذا الموسم",
        ),
        items: tr("defaultSections.lookbook.items", [
          {
            imageUrl: "/lookbook-1-optimized.jpg",
            tag: "Fashion",
            title: "Egyptian\\n Beauty",
            desc: "An exclusive collection inspired by heritage",
            categoryId: "",
          },
          {
            imageUrl: "/lookbook-2-optimized.jpg",
            tag: "Spring 2025",
            title: "Spring\\n Colors",
            desc: "Soft shades for a perfect look",
            categoryId: "",
          },
          {
            imageUrl: "/lookbook-3-optimized.jpg",
            tag: "Beauty",
            title: "Beauty\\n Magic",
            desc: "High quality care products",
            categoryId: "",
          },
        ]),
      },
      settings: { columns: 3 },
    },
    "product-catalog": {
      content: {
        heading: tr("defaultSections.productCatalog.heading", "جميع المنتجات"),
        subheading: tr(
          "defaultSections.productCatalog.subheading",
          "كتالوج كامل",
        ),
      },
      settings: { layout: "grid", showPrices: true, showQuickAdd: true },
    },
    "trust-strip": {
      content: {
        items: tr(
          isDarkGlamour
            ? "defaultSections.trustStrip.itemsDarkGlamour"
            : "defaultSections.trustStrip.items",
          isDarkGlamour
            ? [
                {
                  icon: "🖤",
                  title: "Premium Quality",
                  text: "Unmatched elegance",
                },
              ]
            : [
                { icon: "🚚", title: "توصيل سريع", text: "خلال 2-5 أيام" },
                { icon: "🔒", title: "دفع آمن", text: "بطاقة أو كاش" },
                { icon: "↩️", title: "إرجاع مجاني", text: "خلال 14 يوم" },
                { icon: "⭐", title: "جودة مضمونة", text: "منتجات أصلية 100%" },
              ],
        ),
      },
      settings: {},
    },
  };

  const d = defaults[type];
  return {
    id,
    type,
    label: SECTION_LABELS[type],
    visible: true,
    order: 0,
    content: d.content,
    settings: d.settings,
  };
}

// ─── Default theme ────────────────────────────────────────────────────────────
export const DEFAULT_THEME: ThemeConfig = {
  primaryColor: "hsl(340, 40%, 60%)",
  secondaryColor: "hsl(340, 50%, 95%)",
  fontPairing: "serif-sans",
  buttonStyle: "pill",
  radius: 8,
  animationLevel: "subtle",
  pageWidth: "contained",
  cardShadow: "soft",
};

// ─── Personality presets ──────────────────────────────────────────────────────
export const PERSONALITY_PRESETS: Record<
  PersonalityType,
  {
    label: string;
    desc: string;
    emoji: string;
    colors: string[];
    font: string;
    example: string;
    theme: Partial<ThemeConfig>;
  }
> = {
  "dark-glam": {
    label: "دارك جلامور",
    desc: "لمسة من الغموض والأناقة الفاخرة",
    emoji: "🖤",
    colors: ["#1a0000", "#d4af37"],
    font: "Cormorant Garamond",
    example: '"تألقي بجرأة — حيث يلتقي الغموض بالفخامة"',
    theme: {
      primaryColor: "#1a0000",
      secondaryColor: "#d4af37",
      fontPairing: "serif-serif",
      buttonStyle: "square",
      cardShadow: "soft",
    },
  },
  elegant: {
    label: "أنيقة وراقية",
    desc: "لعلامات تجارية فاخرة تستهدف الذوق الرفيع",
    emoji: "💎",
    colors: ["#1a1614", "#c8963a"],
    font: "Cormorant Garamond",
    example: '"أناقة لا تُقاوَم — مجموعة حصرية لكِ"',
    theme: {
      primaryColor: "#1a1614",
      secondaryColor: "#c8963a",
      fontPairing: "serif-serif",
      buttonStyle: "square",
      cardShadow: "soft",
    },
  },
  friendly: {
    label: "ودودة وبسيطة",
    desc: "للمتاجر القريبة من قلب العميل وتبني علاقة دافئة",
    emoji: "🤗",
    colors: ["#e57373", "#f9a825"],
    font: "Cairo",
    example: '"كل يوم إطلالة مختلفة — نحن هنا نساعدك"',
    theme: {
      primaryColor: "#e57373",
      secondaryColor: "#f9a825",
      fontPairing: "sans-sans",
      buttonStyle: "pill",
      cardShadow: "soft",
    },
  },
  bold: {
    label: "جريئة وعصرية",
    desc: "للعلامات التي تريد أن تبرز وتكون الحديث",
    emoji: "⚡",
    colors: ["#d32f2f", "#212121"],
    font: "Cairo",
    example: '"لا وقت للرتابة — أنتِ استثنائية"',
    theme: {
      primaryColor: "#d32f2f",
      secondaryColor: "#212121",
      fontPairing: "sans-sans",
      buttonStyle: "square",
      animationLevel: "lively",
    },
  },
  minimal: {
    label: "مينيمال ونظيف",
    desc: "للعلامات التي تؤمن بأن البساطة هي أقصى الفخامة",
    emoji: "○",
    colors: ["#333333", "#eeeeee"],
    font: "Roboto",
    example: '"أقل هو أكثر — الجمال في التفاصيل"',
    theme: {
      primaryColor: "#333333",
      secondaryColor: "#888888",
      fontPairing: "sans-sans",
      buttonStyle: "rounded",
      cardShadow: "none",
      animationLevel: "none",
    },
  },
  warm: {
    label: "دافئة وحرفية",
    desc: "للمنتجات اليدوية والعلامات ذات الطابع الشخصي",
    emoji: "🌿",
    colors: ["#795548", "#ff8f00"],
    font: "Cairo",
    example: '"صُنع بالحب — لأجلكِ أنتِ"',
    theme: {
      primaryColor: "#795548",
      secondaryColor: "#ff8f00",
      fontPairing: "serif-sans",
      buttonStyle: "rounded",
      cardShadow: "soft",
    },
  },
  youthful: {
    label: "شبابية وملونة",
    desc: "للعلامات التي تستهدف الجيل الجديد والروح العصرية",
    emoji: "🌈",
    colors: ["#7c4dff", "#ff4081"],
    font: "Cairo",
    example: '"Style Your Life — كل يوم مختلف"',
    theme: {
      primaryColor: "#7c4dff",
      secondaryColor: "#ff4081",
      fontPairing: "sans-sans",
      buttonStyle: "pill",
      animationLevel: "lively",
      cardShadow: "strong",
    },
  },
};

// ─── Style / Template presets ─────────────────────────────────────────────────
export const STYLE_PRESETS: Record<
  StyleType,
  { label: string; desc: string; emoji: string; sections: SectionType[] }
> = {
  "dark-glamour": {
    label: "دارك جلامور",
    desc: "لمسة من الغموض والأناقة الفاخرة",
    emoji: "🖤",
    sections: [
      "hero",
      "trust-strip",
      "new-arrivals",
      "lookbook",
      "categories",
      "about",
      "newsletter",
    ],
  },
  "modern-boutique": {
    label: "بوتيك عصري",
    desc: "مثالي للأزياء والإكسسوارات الراقية",
    emoji: "👗",
    sections: [
      "hero",
      "trust-strip",
      "new-arrivals",
      "categories",
      "lookbook",
      "about",
      "newsletter",
    ],
  },
  "beauty-brand": {
    label: "علامة تجميل",
    desc: "لمنتجات العناية والمكياج والتجميل",
    emoji: "💄",
    sections: [
      "hero",
      "best-sellers",
      "categories",
      "about",
      "testimonials",
      "faq",
      "whatsapp",
      "newsletter",
    ],
  },
  "minimal-store": {
    label: "متجر مينيمال",
    desc: "تصميم نظيف يُبرز المنتج بلا تشتيت",
    emoji: "○",
    sections: ["hero", "new-arrivals", "categories", "about", "newsletter"],
  },
  "premium-fashion": {
    label: "أزياء فاخرة",
    desc: "للكوليكشنات المميزة والخطوط العالية",
    emoji: "✨",
    sections: [
      "hero",
      "lookbook",
      "new-arrivals",
      "about",
      "testimonials",
      "newsletter",
    ],
  },
  "local-brand": {
    label: "علامة محلية",
    desc: "تُبرز الهوية المحلية والأصالة المصرية",
    emoji: "🌍",
    sections: [
      "hero",
      "about",
      "new-arrivals",
      "trust-strip",
      "whatsapp",
      "instagram",
      "faq",
    ],
  },
  "playful-shop": {
    label: "متجر مرح",
    desc: "للمنتجات الشبابية والملونة والمبهجة",
    emoji: "🎨",
    sections: [
      "hero",
      "categories",
      "best-sellers",
      "offers",
      "instagram",
      "newsletter",
    ],
  },
  "luxury-catalog": {
    label: "كتالوج فاخر",
    desc: "عرض احترافي يشبه المجلات العالمية",
    emoji: "🏅",
    sections: [
      "hero",
      "lookbook",
      "categories",
      "new-arrivals",
      "testimonials",
      "about",
      "newsletter",
    ],
  },
};

// ─── Default store config ─────────────────────────────────────────────────────
export function createDefaultConfig(
  partial?: Partial<StoreConfig>,
  t?: TFunction,
): StoreConfig {
  const name = partial?.brand?.name ?? "متجري";
  const category = partial?.brand?.category ?? "fashion";
  return {
    brand: {
      name,
      category: "fashion",
      targetCustomer: "",
      uniqueValue: "",
      personality: "elegant",
      tone: "دافئة وأنيقة",
      ...(partial?.brand ?? {}),
    },
    theme: { ...DEFAULT_THEME, ...(partial?.theme ?? {}) },
    homepage: {
      sections: normalizeHomepageSections(
        partial?.homepage?.sections,
        name,
        category,
        t,
        partial?.brand?.style as StyleType,
      ),
    },
    business: {
      whatsapp: "",
      city: "",
      deliveryAreas: [],
      paymentMethods: ["cod"],
      returnPolicy: "نقبل الإرجاع خلال 14 يوم",
      socialLinks: {},
      ...(partial?.business ?? {}),
    },
  };
}

// ─── AI mock suggestions ──────────────────────────────────────────────────────
export interface AISuggestion {
  prompt: string;
  icon: string;
}

export const AI_QUICK_ACTIONS: AISuggestion[] = [
  { prompt: "اكتب العنوان الرئيسي (Hero)", icon: "✨" },
  { prompt: "اجعل المتجر يبدو أفخم", icon: "💎" },
  { prompt: "وضح التوصيل والإرجاع", icon: "🚚" },
  { prompt: "رتب الأقسام لقصة أفضل", icon: "📐" },
  { prompt: "تحقق من الجاهزية للنشر", icon: "✅" },
  { prompt: "حسّن القسم المحدد", icon: "🎯" },
];

export const MOCK_AI_RESPONSES: Record<string, string> = {
  default: "سأساعدك في تحسين قصة متجرك. اختر أحد الإجراءات أعلاه أو اكتب طلبك.",
  "اكتب العنوان الرئيسي (Hero)": `اقتراحات للعنوان الرئيسي:\n\n• "اكتشفي أناقتكِ — تشكيلة تليق بكِ"\n• "ملابس ترويها حكايتكِ"\n• "لأن أسلوبكِ يستحق الأفضل"\n\nهذا هو أول ما تراه العميلة، لنحرص على أن يشد انتباهها.`,
  "اجعل المتجر يبدو أفخم": `اللمسات الفاخرة:\n\n• استخدمي ألوان داكنة مثل الأسود أو العنابي مع لمسات ذهبية.\n• قللي عدد الأقسام في الصفحة الرئيسية لتبدو كمعرض فني.\n• استخدمي صور عالية الجودة ذات خلفيات موحدة.`,
  "وضح التوصيل والإرجاع": `إضافة الثقة أمر مهم:\n\n• أضيفي قسم "مميزات المتجر".\n• أوضحي سياسة الاسترجاع (مثال: "نقبل الاسترجاع خلال 14 يوماً").\n• اذكري مدة التوصيل بصراحة لبناء الثقة.`,
  "رتب الأقسام لقصة أفضل": `الترتيب الموصى به لمتجر الأزياء:\n\n1. الصورة الرئيسية (Hero)\n2. مميزات المتجر (Trust Strip)\n3. وصل حديثاً\n4. الأقسام\n5. لوك بوك\n6. آراء العملاء\n7. قصة المتجر\n8. النشرة البريدية\n\nهذا الترتيب يبني ثقة العميل خطوة بخطوة.`,
  "تحقق من الجاهزية للنشر": `تقرير مراجعة القصة:\n\n✅ الواجهة تبدو رائعة\n✅ المنتجات واضحة\n⚠️ تأكدي من إضافة رقم الواتساب لسهولة التواصل\n❌ لم تضيفي معلومات التوصيل بعد\n\nقصتك شبه مكتملة! أضيفي المتبقي لنتمكن من النشر.`,
  "حسّن القسم المحدد": `تلميحات للقسم الحالي:\n\n• حافظي على النصوص قصيرة.\n• استخدمي أزرار دعوة للتصرف (CTA) واضحة مثل "تسوقي الآن".\n• تأكدي من توافق الصور مع هوية العلامة.`,
};
