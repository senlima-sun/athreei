# Extension Testing Guide

This document provides comprehensive information about testing the athreei Chrome extension, with a focus on the Playwright E2E tests for the permission request flow.

## Overview

The athreei extension has two types of tests:

1. **Unit Tests** - Vitest tests for individual components and functions
2. **E2E Tests** - Playwright tests for end-to-end flows (permission dialogs, user interactions)

## E2E Tests (Playwright)

### Setup

1. **Build the extension:**
   ```bash
   cd packages/extension
   bun run build
   ```

2. **Install Playwright browsers (first time only):**
   ```bash
   bunx playwright install chromium
   ```

### Running Tests

```bash
# Run all E2E tests
bun run test:e2e

# Run with UI mode (interactive, recommended for development)
bun run test:e2e:ui

# Run in debug mode (step through tests)
bun run test:e2e:debug
```

### Test Files

Located in `/Users/solemnis/Documents/athreei/packages/extension/tests/`:

- **permission-flow.spec.ts** - Automated tests for permission dialog flow
- **test-page.html** - Interactive test page for manual testing
- **README.md** - Detailed test documentation
- **.gitignore** - Git ignore rules for test artifacts

### Permission Flow Tests

The tests cover the complete permission request flow:

1. **Website → Extension Communication**
   - Website dispatches `aiii:permission` event
   - Content script receives and validates event
   - Background script shows permission dialog

2. **User Interaction**
   - Dialog appears with permission details
   - User can Allow, Deny, or Allow Once
   - User can check "Remember my choice"
   - Dialog can be closed via close button or Escape key

3. **Extension → Website Response**
   - Extension dispatches `aiii:permission-response` event
   - Website receives decision and metadata

### Test Coverage

Current tests verify:

- ✅ Extension and test page loading
- ✅ Permission dialog appearance
- ✅ Allow button functionality
- ✅ Deny button functionality
- ✅ Allow Once button functionality
- ✅ All permission scopes (read, interact, navigate, screenshot, execute, custom)
- ✅ Remember choice checkbox
- ✅ Close button functionality
- ✅ Escape key functionality

### Manual Testing

You can manually test the permission flow:

1. Build the extension: `bun run build`
2. Load the extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select `/Users/solemnis/Documents/athreei/packages/extension/dist`
3. Open `/Users/solemnis/Documents/athreei/packages/extension/tests/test-page.html` in Chrome
4. Click any permission request button to test different scopes

## Unit Tests (Vitest)

### Running Unit Tests

```bash
# Run all unit tests
bun test

# Run in watch mode
bun run test:watch

# Run specific test file
bun test src/content/__tests__/permission-dialog.test.ts
```

### Unit Test Files

The extension has comprehensive unit test coverage:

- `/Users/solemnis/Documents/athreei/packages/extension/src/content/__tests__/permission-dialog.test.ts`
- `/Users/solemnis/Documents/athreei/packages/extension/src/content/__tests__/website-bridge.test.ts`
- `/Users/solemnis/Documents/athreei/packages/extension/src/content/__tests__/provider-bridge.test.ts`
- `/Users/solemnis/Documents/athreei/packages/extension/src/content/__tests__/events.test.ts`
- `/Users/solemnis/Documents/athreei/packages/extension/src/background/__tests__/permission-handler.test.ts`

## Permission Flow Architecture

### Event Flow

```
Website                Content Script           Background Script         Permission Dialog
   |                         |                          |                         |
   |--aiii:permission------->|                          |                         |
   |                         |--permission_request----->|                         |
   |                         |                          |--show_permission_dialog->|
   |                         |                          |                         |
   |                         |                          |<---user decision--------|
   |                         |<---response--------------|                         |
   |<-aiii:permission-resp---|                          |                         |
```

### Permission Scopes

The extension supports these permission scopes:

- **read** - Read page content and elements
- **interact** - Click, type, scroll interactions
- **navigate** - Navigate to different URLs
- **screenshot** - Capture screenshots
- **execute** - Execute JavaScript code
- **custom** - Use custom tools registered by websites

### Permission Levels

- **ask** (default) - Show dialog for each request
- **allowed** - Always allow without prompting
- **denied** - Always deny without prompting
- **allow_once** - Allow this one time only (doesn't persist)

### Event Schema

#### aiii:permission (Website → Extension)

```typescript
{
  scope: 'read' | 'interact' | 'navigate' | 'screenshot' | 'execute' | 'custom',
  reason?: string,
  tools?: string[],
  duration?: 'session' | 'persistent' | 'once'
}
```

#### aiii:permission-response (Extension → Website)

```typescript
{
  requestId?: string,
  allowed: boolean,
  decision: 'allow' | 'deny' | 'allow_once',
  remember: boolean,
  error?: string,
  timestamp: number
}
```

## Troubleshooting

### Extension Not Loading in Tests

**Symptoms:** Tests fail with "Extension not found" or timeout errors

**Solutions:**
1. Ensure extension is built: `bun run build`
2. Check that `dist/` directory exists and contains manifest.json
3. Verify the extensionPath in test matches your directory structure

### Permission Dialog Not Appearing

**Symptoms:** Tests timeout waiting for `[role="dialog"]`

**Solutions:**
1. Check browser console for errors in test browser
2. Verify content script is injected (Chrome DevTools → Sources)
3. Ensure background service worker is running (check chrome://extensions/)
4. Check that website-bridge is initialized properly

### Shadow DOM Element Selection Issues

**Symptoms:** Cannot find buttons or elements within the dialog

**Note:** The permission dialog uses Shadow DOM for style isolation. Playwright may have difficulty selecting elements inside shadow DOM. Current tests use generic selectors that work with the dialog's outer structure.

**Solutions:**
1. Use Playwright's `page.locator()` with text selectors
2. Wait for elements to be visible before interacting
3. Consider using `page.evaluate()` to pierce shadow DOM if needed

### Tests Timing Out

**Symptoms:** Tests fail due to timeout errors

**Solutions:**
1. Increase timeout in `playwright.config.ts` (currently 30s)
2. Add more `waitForTimeout()` calls to allow extension initialization
3. Check if extension is actually loaded by inspecting test browser manually
4. Ensure background service worker isn't crashing

## CI/CD Integration

The tests are designed to work in CI environments:

**Environment Variable:** Set `CI=true`

**CI Behavior:**
- Uses GitHub Actions reporter
- Retries failed tests twice
- Runs tests serially (not in parallel)
- Captures screenshots on failure
- Retains video on failure

**Example GitHub Actions:**

```yaml
- name: Build extension
  run: bun run build

- name: Install Playwright
  run: bunx playwright install chromium

- name: Run E2E tests
  run: bun run test:e2e
  env:
    CI: true
```

## Best Practices

1. **Always build before testing:** Extension must be built before E2E tests
2. **Use UI mode during development:** `bun run test:e2e:ui` for better debugging
3. **Check console logs:** Tests output useful debugging information
4. **Test in real browser:** Manual testing with test-page.html is valuable
5. **Keep tests isolated:** Each test should be independent
6. **Use descriptive test names:** Make failures easy to diagnose

## Future Improvements

Potential enhancements for the test suite:

1. **Shadow DOM piercing** - Improve element selection within shadow DOM
2. **Visual regression tests** - Screenshot comparison for dialog UI
3. **Performance tests** - Measure dialog render time and response time
4. **Network request mocking** - Mock permission API calls
5. **Multi-tab tests** - Test permission flow across multiple tabs
6. **Permission persistence tests** - Verify remembered choices persist correctly
7. **Error scenario tests** - Test network failures, timeouts, etc.
8. **Accessibility tests** - Verify keyboard navigation and screen reader support

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Chrome Extensions Testing](https://developer.chrome.com/docs/extensions/mv3/testing/)
- [Vitest Documentation](https://vitest.dev)
- [Model Context Protocol](https://modelcontextprotocol.io)

## Support

For issues or questions about testing:

1. Check the test output logs for detailed error messages
2. Review the test README: `/Users/solemnis/Documents/athreei/packages/extension/tests/README.md`
3. Inspect the test page manually: `tests/test-page.html`
4. Review existing test cases for examples
