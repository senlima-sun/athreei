# Changelog

All notable changes to `@athreei/site-sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-06

### Added

- **Simple API** (`athreei` singleton)
  - `onReady(callback)` - Wait for extension to be ready
  - `registerTool(definition)` - Register custom tools
  - `onRequest(toolName, handler)` - Handle tool requests
  - `requestPermission(options)` - Request user permissions
  - `onBeforeAction(callback)` - Intercept actions before execution
  - `onAfterAction(callback)` - Listen for completed actions

- **Advanced API** (`AthreeiClient` class)
  - Full control over client lifecycle
  - `waitForReady()` - Async ready detection
  - `destroy()` - Clean up resources
  - Debug mode with console logging
  - Configurable timeout

- **Mock Mode** for testing
  - `enableMockMode(options)` - Simulate extension behavior
  - `disableMockMode()` - Return to normal mode
  - `isMockModeEnabled()` - Check current mode
  - `triggerMockRequest(tool, args)` - Trigger tool requests
  - `setMockResponse(tool, response)` - Set mock responses
  - `getMockResponse(tool)` - Get mock response
  - `clearMockResponses()` - Clear all mocks

- **TypeScript Support**
  - Full type definitions included
  - Exported types: `ToolDefinition`, `ToolParameter`, `RequestHandler`,
    `AthreeiInfo`, `PermissionOptions`, `PermissionScope`, `ActionCallback`,
    `ActionResultCallback`, `Unsubscribe`
  - Event types re-exported from `@athreei/shared`

- **Permission System**
  - Scopes: `read`, `interact`, `navigate`, `screenshot`, `execute`, `custom`
  - Duration: `session`, `persistent`, `once`
  - Reason field for user-facing messages

- **Build Outputs**
  - ESM (`dist/index.js`)
  - CommonJS (`dist/index.cjs`)
  - Type definitions (`dist/index.d.ts`)
  - CDN-compatible via unpkg

### Documentation

- Comprehensive README with API reference
- Usage examples for all features
- Best practices guide
- Troubleshooting section
- TypeScript integration guide

---

## Future Roadmap

### [0.2.0] - Planned

- [ ] React hooks (`useAthreei`, `useTool`, `usePermission`)
- [ ] Vue composables
- [ ] Framework-agnostic state management
- [ ] Improved error messages with troubleshooting links

### [0.3.0] - Planned

- [ ] Tool validation utilities
- [ ] Schema builder helpers
- [ ] Performance monitoring hooks
- [ ] Analytics integration option

### [1.0.0] - Planned

- [ ] Stable API guarantee
- [ ] Comprehensive test suite
- [ ] Production hardening
- [ ] Enterprise features
