import { chromium } from '@playwright/test';

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Navigating to product page...");
  // Navigate to the product page
  await page.goto('https://nour-snowy-two.vercel.app/store/mana/product/6483-hggyj', { waitUntil: 'networkidle' });

  console.log("Checking for product images...");
  // Find all images on the page
  const images = await page.locator('img').all();
  
  let displayedCount = 0;
  let brokenCount = 0;

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const src = await img.getAttribute('src');
    const alt = await img.getAttribute('alt') || 'no-alt';
    
    // Evaluate if the image is broken by checking naturalWidth
    const isVisibleAndLoaded = await img.evaluate((node: HTMLImageElement) => {
      return node.complete && node.naturalWidth > 0;
    });

    if (isVisibleAndLoaded) {
      console.log(`✅ Image loaded successfully: alt="${alt}", src="${src}"`);
      displayedCount++;
    } else {
      console.log(`❌ Image is BROKEN or not displayed: alt="${alt}", src="${src}"`);
      brokenCount++;
    }
  }

  console.log(`\nSummary: ${displayedCount} images displayed correctly, ${brokenCount} images broken.`);
  
  await browser.close();
  
  if (brokenCount > 0) {
    process.exit(1);
  }
})();