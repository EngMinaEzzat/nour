const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'lib', 'store-config.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update normalizeHomepageSections
content = content.replace(
  'export function normalizeHomepageSections(sections: SectionConfig[] | undefined, storeName: string, category: string = "fashion"): SectionConfig[] {',
  'export function normalizeHomepageSections(sections: SectionConfig[] | undefined, storeName: string, category: string = "fashion", t?: any): SectionConfig[] {'
);

// 2. Update the push to createDefaultSection
content = content.replace(
  'normalized.push({ ...createDefaultSection(type, storeName, category), order: normalized.length });',
  'normalized.push({ ...createDefaultSection(type, storeName, category, t), order: normalized.length });'
);

// 3. Update createDefaultSection signature
content = content.replace(
  'export function createDefaultSection(type: SectionType, storeName: string, category: string = "fashion"): SectionConfig {',
  'export function createDefaultSection(type: SectionType, storeName: string, category: string = "fashion", t?: any): SectionConfig {'
);

// 4. Update the return in createDefaultSection
content = content.replace(
  'const d = defaults[type];\n  return { id, type, label: SECTION_LABELS[type], visible: true, order: 0, content: d.content, settings: d.settings };',
  'const d = defaults[type];\n  const label = t ? t(`sections.${type}`, { defaultValue: SECTION_LABELS[type] }) : SECTION_LABELS[type];\n  return { id, type, label, visible: true, order: 0, content: d.content, settings: d.settings };'
);

// 5. Update createDefaultConfig
content = content.replace(
  'sections: normalizeHomepageSections(partial?.homepage?.sections, name, category),',
  'sections: normalizeHomepageSections(partial?.homepage?.sections, name, category, undefined),'
);

// 6. Now wrap the hardcoded Arabic defaults in defaults[type] with t? t("..."): ...
// This is a bit complex with regex. Instead of modifying every single line of defaults, let's just do a manual replace or simple replace for the main ones.
content = content.replace(
  'heading: isCosmetics ? `اكتشفي جمالكِ مع ${storeName}` : `اكتشفي أحدث تشكيلة من ${storeName}`,',
  'heading: t ? t("defaultSections.hero.heading", { defaultValue: isCosmetics ? `اكتشفي جمالكِ مع ${storeName}` : `اكتشفي أحدث تشكيلة من ${storeName}`, storeName }) : (isCosmetics ? `اكتشفي جمالكِ مع ${storeName}` : `اكتشفي أحدث تشكيلة من ${storeName}`),'
);
content = content.replace(
  'subheading: isCosmetics ? "مستحضرات عناية وتجميل تبرز جمالك الطبيعي" : "أزياء راقية بأسعار تناسبك",',
  'subheading: t ? t("defaultSections.hero.subheading", { defaultValue: isCosmetics ? "مستحضرات عناية وتجميل تبرز جمالك الطبيعي" : "أزياء راقية بأسعار تناسبك" }) : (isCosmetics ? "مستحضرات عناية وتجميل تبرز جمالك الطبيعي" : "أزياء راقية بأسعار تناسبك"),'
);
content = content.replace(
  'ctaText: "تسوقي الآن"',
  'ctaText: t ? t("defaultSections.hero.ctaText", { defaultValue: "تسوقي الآن" }) : "تسوقي الآن"'
);
content = content.replace(
  'heading: "وصل حديثاً", subheading: "أحدث المنتجات في مجموعتنا"',
  'heading: t ? t("defaultSections.newArrivals.heading", { defaultValue: "وصل حديثاً" }) : "وصل حديثاً", subheading: t ? t("defaultSections.newArrivals.subheading", { defaultValue: "أحدث المنتجات في مجموعتنا" }) : "أحدث المنتجات في مجموعتنا"'
);
content = content.replace(
  'heading: "الأكثر مبيعاً", subheading: "المنتجات المفضلة لعملائنا"',
  'heading: t ? t("defaultSections.bestSellers.heading", { defaultValue: "الأكثر مبيعاً" }) : "الأكثر مبيعاً", subheading: t ? t("defaultSections.bestSellers.subheading", { defaultValue: "المنتجات المفضلة لعملائنا" }) : "المنتجات المفضلة لعملائنا"'
);
content = content.replace(
  'heading: "تسوقي حسب القسم"',
  'heading: t ? t("defaultSections.categories.heading", { defaultValue: "تسوقي حسب القسم" }) : "تسوقي حسب القسم"'
);

fs.writeFileSync(filePath, content);
console.log('done!');
