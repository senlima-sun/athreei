# Extension E2E Tests

This directory contains Playwright end-to-end tests for the athreei Chrome extension, specifically testing the permission request flow.

## Files

- **test-page.html** - Interactive HTML test page for manually testing permission flows
- **permission-flow.spec.ts** - Automated Playwright tests for permission dialog behavior

## Running Tests

### Prerequisites

1. Build the extension first:
   ```bash
   bun run build
   ```

2. Install Playwright browsers (first time only):
   ```bash
   bunx playwright install chromium
   ```

### Run Tests

```bash
# Run all E2E tests
bun run test:e2e

# Run with UI mode (recommended for debugging)
bun run test:e2e:ui

# Run in debug mode
bun run test:e2e:debug
```

## Manual Testing

You can also manually test the permission flow:

1. Build the extension: `bun run build`
2. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `packages/extension/dist` directory
3. Open `test-page.html` in Chrome
4. Click the permission request buttons to test different scopes

## Test Coverage

The automated tests cover:

- Loading the extension and test page
- Showing permission dialog when website requests permission
- Allowing permissions (Allow button)
- Denying permissions (Deny button)
- Allow once functionality (Allow Once button)
- All permission scopes (read, interact, navigate, screenshot, execute, custom)
- Remember choice checkbox
- Closing dialog via close button
- Closing dialog via Escape key

## How It Works

The permission flow works like this:

1. **Website dispatches event**: `window.dispatchEvent(new CustomEvent('aiii:permission', { detail: { scope: 'read', ... } }))`
2. **Content script receives event**: Listens for `aiii:permission` events
3. **Background script shows dialog**: Injects permission dialog into page via content script
4. **User makes choice**: Clicks Allow, Deny, or Allow Once
5. **Extension dispatches response**: `window.dispatchEvent(new CustomEvent('aiii:permission-response', { detail: { allowed: true, ... } }))`
6. **Website receives response**: Listens for `aiii:permission-response` event

## Important Notes

- **Extensions require non-headless mode**: Chrome extensions don't work in headless mode, so tests run with `headless: false`
- **Shadow DOM**: The permission dialog uses Shadow DOM for style isolation, which may affect element selection in tests
- **Timing**: Tests include `waitForTimeout` calls to allow extension content script injection time

## Troubleshooting

### Extension not loading
- Make sure you built the extension first: `bun run build`
- Check that `dist/` directory exists and contains manifest.json
- Verify the extension path in the test matches your directory structure

### Permission dialog not appearing
- Check browser console for errors
- Verify content script is injected (check Chrome DevTools > Sources)
- Ensure background service worker is running (check chrome://extensions/)

### Tests timing out
- Increase timeout in playwright.config.ts
- Check if extension is actually loaded by inspecting chrome://extensions in the test browser

## CI/CD

These tests are designed to work in CI environments:
- Set `CI=true` environment variable
- Tests will retry twice on failure
- GitHub Actions reporter will be used
- Tests run serially (not in parallel) for stability
