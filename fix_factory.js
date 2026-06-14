const fs = require('fs');
const filePath = 'artifacts/fashion-store/src/lib/store-config.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Revert previous parameter changes and use personality check
// Remove style parameter from createDefaultConfig
content = content.replace(
  /export function createDefaultConfig\(partial\?: Partial<StoreConfig>, t\?: TFunction, style\?: StyleType \| string\): StoreConfig {/g,
  `export function createDefaultConfig(partial?: Partial<StoreConfig>, t?: TFunction): StoreConfig {`
);

// We need to pass the personality down to normalizeHomepageSections
content = content.replace(
  /sections: normalizeHomepageSections\(partial\?.homepage\?.sections, name, category, t, style\),/g,
  `sections: normalizeHomepageSections(partial?.homepage?.sections, name, category, t, partial?.brand?.personality),`
);

// We need to pass it from normalizeHomepageSections to createDefaultSection
// It accepts personality instead of style now.
content = content.replace(
  /export function normalizeHomepageSections\(sections: SectionConfig\[\] \| undefined, storeName: string, category: string = "fashion", t\?: TFunction, style\?: StyleType \| string\): SectionConfig\[\] {/g,
  `export function normalizeHomepageSections(sections: SectionConfig[] | undefined, storeName: string, category: string = "fashion", t?: TFunction, personality?: string): SectionConfig[] {`
);

content = content.replace(
  /const defaultSection = createDefaultSection\(section.type, storeName, category, t, style\);/g,
  `const defaultSection = createDefaultSection(section.type, storeName, category, t, personality);`
);

content = content.replace(
  /createDefaultSection\(type, storeName, category, t, style\)/g,
  `createDefaultSection(type, storeName, category, t, personality)`
);

// Update createDefaultSection
content = content.replace(
  /export function createDefaultSection\(type: SectionType, storeName: string, category: string = "fashion", t\?: TFunction, style\?: StyleType \| string\): SectionConfig {/g,
  `export function createDefaultSection(type: SectionType, storeName: string, category: string = "fashion", t?: TFunction, personality?: string): SectionConfig {`
);

content = content.replace(
  /const isActive = style === "dynamic-active";/g,
  `const isActive = personality === "active";` // using personality instead!
);

fs.writeFileSync(filePath, content);

// Add the test
const testPath = 'artifacts/fashion-store/src/lib/store-config-dynamic.test.ts';
const testContent = `
import { describe, it, expect, vi } from 'vitest';
import { createDefaultConfig, createDefaultSection, normalizeHomepageSections } from './store-config';

describe('store-config dynamic-active theme', () => {
  const mockT = vi.fn((key) => key);

  it('createDefaultSection should apply active i18n keys and images if personality is active', () => {
    const heroSection = createDefaultSection('hero', 'Nike Store', 'fashion', mockT, 'active');
    expect(heroSection.content.heading).toBe('defaultSections.hero.headingActive');
    expect(heroSection.content.subheading).toBe('defaultSections.hero.subheadingActive');
    expect(heroSection.content.imageUrl).toBe('/hero-active-optimized.jpg');

    const aboutSection = createDefaultSection('about', 'Nike Store', 'fashion', mockT, 'active');
    expect(aboutSection.content.heading).toBe('defaultSections.about.headingActive');
    expect(aboutSection.content.body).toBe('defaultSections.about.bodyActive');
    expect(aboutSection.content.imageUrl).toBe('/about-active-optimized.jpg');

    const lookbookSection = createDefaultSection('lookbook', 'Nike Store', 'fashion', mockT, 'active');
    expect(lookbookSection.content.heading).toBe('defaultSections.lookbook.headingActive');
    expect(lookbookSection.content.items).toBe('defaultSections.lookbook.itemsActive');

    const trustStripSection = createDefaultSection('trust-strip', 'Nike Store', 'fashion', mockT, 'active');
    expect(trustStripSection.content.items).toBe('defaultSections.trustStrip.itemsActive');
  });

  it('createDefaultConfig should propagate active personality to sections', () => {
    const config = createDefaultConfig({
      brand: { personality: 'active' }
    }, mockT);

    const hero = config.homepage.sections.find(s => s.type === 'hero');
    expect(hero?.content.heading).toBe('defaultSections.hero.headingActive');
  });
});
`;
fs.writeFileSync(testPath, testContent);
