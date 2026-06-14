
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
