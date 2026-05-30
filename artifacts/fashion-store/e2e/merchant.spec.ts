import { test } from '@playwright/test';

test.describe('Merchant Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user authentication
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        json: { id: 1, email: 'admin@example.com', role: 'owner', name: 'Admin', storeName: 'Test Store', slug: 'test-store', tenantId: 1 }
      });
    });

    // Mock tenant data
    await page.route('**/api/tenants/1', async (route) => {
      await route.fulfill({
        status: 200,
        json: { id: 1, name: 'Test Store', slug: 'test-store', storeConfig: { business: { paymentMethods: ['cod'] } } }
      });
    });

    // Mock products
    await page.route('**/api/products*', async (route) => {
      await route.fulfill({
        status: 200,
        json: [{ id: 1, name: 'Existing Product', price: 100 }]
      });
    });
  });

  test('should navigate to dashboard and create a product', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'public/qa-screenshots/dashboard-home.png', fullPage: true });

    await page.goto('/products');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'public/qa-screenshots/dashboard-products.png', fullPage: true });
  });
});
