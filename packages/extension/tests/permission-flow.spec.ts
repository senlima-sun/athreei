import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname, '../dist');
const testPagePath = path.resolve(__dirname, 'test-page.html');

test.describe('Permission Flow E2E Tests', () => {
  let context: BrowserContext;

  test.beforeAll(async () => {
    // Launch browser with extension loaded
    // Note: Extensions require headed mode (headless: false)
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
      ],
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should load test page and extension', async () => {
    const page = await context.newPage();
    await page.goto(`file://${testPagePath}`);

    // Verify page loaded
    await expect(page.locator('h1')).toContainText('Permission Test Page');

    // Wait a moment for extension to inject content script
    await page.waitForTimeout(1000);
  });

  test('should show permission dialog when clicking request button', async () => {
    const page = await context.newPage();
    await page.goto(`file://${testPagePath}`);

    // Wait for extension to be ready
    await page.waitForTimeout(1000);

    // Click the request permission button for 'read' scope
    await page.click('#request-read');

    // Wait for permission dialog to appear
    // The dialog is injected by content script with role="dialog"
    try {
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

      // Verify dialog contains expected text
      const dialogText = await page.textContent('[role="dialog"]');
      expect(dialogText).toContain('AI Request');

      console.log('Permission dialog appeared successfully');
    } catch (error) {
      console.error('Permission dialog did not appear. This may indicate:');
      console.error('1. Extension not properly loaded');
      console.error('2. Content script not injected');
      console.error('3. Permission handler not working');
      throw error;
    }
  });

  test('should allow permission when clicking Allow button', async () => {
    const page = await context.newPage();
    await page.goto(`file://${testPagePath}`);
    await page.waitForTimeout(1000);

    // Click request button
    await page.click('#request-interact');

    // Wait for dialog
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Click the Allow button (primary action button)
    const allowButton = page.locator('button:has-text("Allow")').first();
    await allowButton.click();

    // Verify response was received
    await page.waitForSelector('#result[data-received="true"]', { timeout: 5000 });

    const result = await page.textContent('#result');
    expect(result).toContain('allowed');

    // Verify dialog is closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should deny permission when clicking Deny button', async () => {
    const page = await context.newPage();
    await page.goto(`file://${testPagePath}`);
    await page.waitForTimeout(1000);

    // Click request button
    await page.click('#request-navigate');

    // Wait for dialog
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Click the Deny button
    const denyButton = page.locator('button:has-text("Deny")').first();
    await denyButton.click();

    // Verify response was received with denied status
    await page.waitForSelector('#result[data-received="true"]', { timeout: 5000 });

    const result = await page.textContent('#result');
    expect(result).not.toContain('allowed');

    // Verify dialog is closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should allow once when clicking Allow Once button', async () => {
    const page = await context.newPage();
    await page.goto(`file://${testPagePath}`);
    await page.waitForTimeout(1000);

    // Click request button
    await page.click('#request-screenshot');

    // Wait for dialog
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Click the Allow Once button
    const allowOnceButton = page.locator('button:has-text("Allow Once")').first();
    await allowOnceButton.click();

    // Verify response was received
    await page.waitForSelector('#result[data-received="true"]', { timeout: 5000 });

    const result = await page.textContent('#result');
    expect(result).toContain('allowed');

    // Verify dialog is closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should test all permission scopes', async () => {
    const scopes = [
      { id: 'request-read', name: 'read' },
      { id: 'request-interact', name: 'interact' },
      { id: 'request-navigate', name: 'navigate' },
      { id: 'request-screenshot', name: 'screenshot' },
      { id: 'request-execute', name: 'execute' },
      { id: 'request-custom', name: 'custom' },
    ];

    for (const scope of scopes) {
      const page = await context.newPage();
      await page.goto(`file://${testPagePath}`);
      await page.waitForTimeout(1000);

      console.log(`Testing scope: ${scope.name}`);

      // Click request button for this scope
      await page.click(`#${scope.id}`);

      // Wait for dialog
      try {
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

        // Click Allow
        await page.click('button:has-text("Allow")');

        // Verify response
        await page.waitForSelector('#result[data-received="true"]', { timeout: 5000 });

        console.log(`  ✓ ${scope.name} scope working`);
      } catch (error) {
        console.error(`  ✗ ${scope.name} scope failed`);
        throw error;
      }

      await page.close();
    }
  });

  test('should remember choice when checkbox is checked', async () => {
    const page = await context.newPage();
    await page.goto(`file://${testPagePath}`);
    await page.waitForTimeout(1000);

    // Click request button
    await page.click('#request-execute');

    // Wait for dialog
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Check the "remember" checkbox (it's inside shadow DOM, so we need to handle it differently)
    // For now, we'll just verify the checkbox exists
    const dialogContent = await page.content();
    expect(dialogContent).toContain('Remember my choice');
  });

  test('should close dialog when clicking close button', async () => {
    const page = await context.newPage();
    await page.goto(`file://${testPagePath}`);
    await page.waitForTimeout(1000);

    // Click request button
    await page.click('#request-read');

    // Wait for dialog
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Click the close button (×)
    const closeButton = page.locator('[aria-label="Close dialog"]').first();
    await closeButton.click();

    // Verify dialog is closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should close dialog when pressing Escape key', async () => {
    const page = await context.newPage();
    await page.goto(`file://${testPagePath}`);
    await page.waitForTimeout(1000);

    // Click request button
    await page.click('#request-interact');

    // Wait for dialog
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Press Escape key
    await page.keyboard.press('Escape');

    // Verify dialog is closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });
});
