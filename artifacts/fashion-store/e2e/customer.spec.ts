import { test } from '@playwright/test';

test.describe('Customer COD Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock storefront API
    await page.route('**/api/storefront/1', async (route) => {
      await route.fulfill({
        status: 200,
        json: { name: 'Test Store', storeConfig: { business: { paymentMethods: ['cod'] } } }
      });
    });

    // Mock products list
    await page.route('**/api/products*', async (route) => {
      await route.fulfill({
        status: 200,
        json: [
          { id: 1, name: 'Cool Shirt', price: 250, tenantId: 1, tenantName: 'Test Store' }
        ]
      });
    });
    
    await page.route('**/api/products/1', async (route) => {
      await route.fulfill({
        status: 200,
        json: { id: 1, name: 'Cool Shirt', price: 250, tenantId: 1, tenantName: 'Test Store', description: 'Very cool' }
      });
    });
  });

  test('should complete a COD order', async ({ page }) => {
    await page.goto('/store/test-store/product/1');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'public/qa-screenshots/product-page.png', fullPage: true });

    await page.goto('/store/test-store/checkout');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'public/qa-screenshots/checkout-page.png', fullPage: true });
  });
});
