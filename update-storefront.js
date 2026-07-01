const fs = require('fs');

let content = fs.readFileSync('./artifacts/fashion-store/src/pages/storefront.tsx', 'utf8');

// Update EditorTextSection signature
content = content.replace(
  /function EditorTextSection\(\{\n  section,\n  primaryColor,\n  onScrollToProducts,\n\}: \{\n  section: SectionConfig;\n  primaryColor: string;\n  onScrollToProducts: \(\) => void;\n\}\) \{/,
  `function EditorTextSection({
  section,
  primaryColor,
  onScrollToProducts,
  whatsappNumber,
  storeName,
}: {
  section: SectionConfig;
  primaryColor: string;
  onScrollToProducts: () => void;
  whatsappNumber?: string | null;
  storeName?: string;
}) {`
);

// Update whatsapp section
content = content.replace(
  /  if \(section\.type === "whatsapp"\) \{\n    return \(\n      <section className="py-16 px-4 sm:px-6 text-center" style=\{\{ background: "var\(--bg-main, #faf7f4\)", direction: i18n\.dir\(\) \}\}>\n        <div className="max-w-2xl mx-auto">\n          <h2 className="text-4xl mb-3" style=\{\{ fontFamily: "var\(--font-heading, 'Playfair Display', Georgia, serif\)", color: "var\(--text-heading, hsl\(340,20%,15%\)\)", fontWeight: 400 \}\}>\{heading\}<\/h2>\n          \{body && <p className="text-sm mb-6" style=\{\{ color: "var\(--text-body, hsl\(340,15%,45%\)\)", fontFamily: "var\(--font-body\)" \}\}>\{body\}<\/p>\}\n          <button onClick=\{onScrollToProducts\} className="px-8 py-3 text-white text-sm font-semibold transition-all" style=\{\{ background: primaryColor, borderRadius: "var\(--btn-radius, 9999px\)", fontFamily: "var\(--font-body\)" \}\}>\n            \{typeof section\.content\.ctaText === "string" \? section\.content\.ctaText : t\("storefront\.hero\.shopNow"\)\}\n          <\/button>\n        <\/div>\n      <\/section>\n    \);\n  \}/,
  `  if (section.type === "whatsapp") {
    const msg = storeName ? encodeURIComponent(\`مرحباً 👋، أريد الاستفسار عن متجر \${storeName}\`) : "";
    return (
      <section className="py-16 px-4 sm:px-6 text-center" style={{ background: "var(--bg-main, #faf7f4)", direction: i18n.dir() }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl mb-3" style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)", color: "var(--text-heading, hsl(340,20%,15%))", fontWeight: 400 }}>{heading}</h2>
          {body && <p className="text-sm mb-6" style={{ color: "var(--text-body, hsl(340,15%,45%))", fontFamily: "var(--font-body)" }}>{body}</p>}
          {whatsappNumber ? (
            <a href={\`https://wa.me/\${whatsappNumber}?text=\${msg}\`} target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3 text-white text-sm font-semibold transition-all" style={{ background: primaryColor, borderRadius: "var(--btn-radius, 9999px)", fontFamily: "var(--font-body)" }}>
              {typeof section.content.ctaText === "string" ? section.content.ctaText : t("storefront.hero.shopNow")}
            </a>
          ) : (
            <button onClick={onScrollToProducts} className="px-8 py-3 text-white text-sm font-semibold transition-all" style={{ background: primaryColor, borderRadius: "var(--btn-radius, 9999px)", fontFamily: "var(--font-body)" }}>
              {typeof section.content.ctaText === "string" ? section.content.ctaText : t("storefront.hero.shopNow")}
            </button>
          )}
        </div>
      </section>
    );
  }`
);

// Update EditorTextSection usage
content = content.replace(
  /        return <EditorTextSection section=\{section\} primaryColor=\{p\} onScrollToProducts=\{scrollToProducts\} \/>;/g,
  `        return <EditorTextSection section={section} primaryColor={p} onScrollToProducts={scrollToProducts} whatsappNumber={getWhatsAppNumber(store as any)} storeName={store.name} />;`
);

fs.writeFileSync('./artifacts/fashion-store/src/pages/storefront.tsx', content);
console.log("Updated storefront.tsx");
