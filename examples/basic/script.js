/**
 * athreei SDK - Basic Example
 *
 * This example demonstrates:
 * 1. Importing the athreei SDK
 * 2. Enabling mock mode for testing without the extension
 * 3. Registering a custom tool
 * 4. Handling AI requests
 * 5. Displaying responses in the UI
 */

// Import the SDK from the built package
// In production, you would use: import { athreei, enableMockMode } from '@athreei/sdk'
// For this example, we use a relative path to the built SDK
import { athreei, enableMockMode } from '../../packages/sdk/dist/index.js'

// =============================================================================
// STEP 1: Enable mock mode for testing
// =============================================================================

/**
 * Mock mode allows you to test your integration without having the athreei
 * extension installed. It simulates the extension's behavior by:
 * - Firing a fake 'ready' event
 * - Allowing you to manually trigger tool requests
 * - Logging all events to the console
 */
enableMockMode({
  // Simulate a small delay for realistic behavior (in milliseconds)
  simulateDelay: 100,

  // Mock version and capabilities that would come from the real extension
  version: '0.1.0-mock',
  capabilities: ['click', 'type', 'navigate', 'scroll', 'screenshot'],

  // Optional: Automatically trigger some tools after initialization
  // autoTriggerTools: [
  //   { tool: 'get_page_info', args: {}, delay: 2000 }
  // ]
})

console.log('[Example] Mock mode enabled - SDK will work without extension')

// =============================================================================
// STEP 2: Wait for athreei to be ready
// =============================================================================

/**
 * The onReady callback is called when the athreei extension (or mock mode)
 * is ready to accept tool registrations and handle requests.
 */
athreei.onReady((info) => {
  console.log('[Example] athreei is ready!', info)

  // Update the UI to show connection status
  updateConnectionStatus('connected', 'Connected to athreei', info)
})

// =============================================================================
// STEP 3: Register a custom tool
// =============================================================================

/**
 * Register a tool that AI apps can use to get information about this page.
 *
 * When an AI (like Claude) wants to use this tool, it will send a request
 * with the tool name and any required parameters. The handler function
 * will be called, and its return value will be sent back to the AI.
 */
athreei.registerTool({
  // Unique name for this tool (used by AI to call it)
  name: 'get_page_info',

  // Description helps the AI understand when to use this tool
  description: 'Get information about the current page including title, URL, and timestamp',

  // Define parameters the AI can provide (all optional in this case)
  parameters: {
    includeMetadata: {
      type: 'boolean',
      description: 'Whether to include additional metadata like viewport size',
      required: false,
      default: false
    }
  },

  // The handler function that executes when the AI calls this tool
  // It receives the parameters and must return a result object
  handler: async ({ includeMetadata = false }) => {
    console.log('[Example] get_page_info tool called with includeMetadata:', includeMetadata)

    // Gather page information
    const pageInfo = {
      title: document.title,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      protocol: window.location.protocol,
      hostname: window.location.hostname,
    }

    // Optionally include additional metadata
    if (includeMetadata) {
      pageInfo.metadata = {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        scrollY: window.scrollY,
        documentHeight: document.documentElement.scrollHeight,
        userAgent: navigator.userAgent,
      }
    }

    // Display in UI
    addResponse('get_page_info', pageInfo)

    // Return the result (this goes back to the AI)
    return pageInfo
  }
})

console.log('[Example] Registered tool: get_page_info')

// =============================================================================
// STEP 4: Optional - Listen for action lifecycle events
// =============================================================================

/**
 * You can listen for actions before and after they execute.
 * This is useful for:
 * - Logging/analytics
 * - Showing loading states
 * - Preventing certain actions
 * - Tracking performance
 */

// Called before any tool handler executes
athreei.onBeforeAction((action) => {
  console.log('[Example] Action about to execute:', action.tool, action.args)

  // You can return false to prevent the action (if cancelable)
  // return false
})

// Called after any tool handler completes
athreei.onAfterAction((result) => {
  console.log('[Example] Action completed:', {
    tool: result.tool,
    success: result.success,
    duration: result.duration,
  })
})

// =============================================================================
// UI Helper Functions
// =============================================================================

/**
 * Update the connection status indicator in the UI
 */
function updateConnectionStatus(status, message, info = null) {
  const statusElement = document.getElementById('status')
  const statusText = document.getElementById('status-text')
  const connectionInfo = document.getElementById('connection-info')

  // Update status class
  statusElement.className = `status ${status}`
  statusText.textContent = message

  // If we have connection info, display it
  if (info) {
    document.getElementById('info-version').textContent = info.version || '-'
    document.getElementById('info-extension-id').textContent = info.extensionId || '-'
    document.getElementById('info-capabilities').textContent =
      info.capabilities ? info.capabilities.join(', ') : '-'
    connectionInfo.style.display = 'block'
  }
}

/**
 * Add a response to the responses list in the UI
 */
function addResponse(toolName, data) {
  const responsesContainer = document.getElementById('responses')

  // Remove empty state if it exists
  const emptyState = responsesContainer.querySelector('.empty-state')
  if (emptyState) {
    emptyState.remove()
  }

  // Create response item
  const responseItem = document.createElement('div')
  responseItem.className = 'response-item'

  const timestamp = new Date().toLocaleTimeString()
  responseItem.innerHTML = `
    <div class="response-time">${timestamp} - Tool: ${toolName}</div>
    <div class="response-data">${JSON.stringify(data, null, 2)}</div>
  `

  // Add to top of list
  responsesContainer.insertBefore(responseItem, responsesContainer.firstChild)

  // Keep only last 10 responses
  const items = responsesContainer.querySelectorAll('.response-item')
  if (items.length > 10) {
    items[items.length - 1].remove()
  }
}

// =============================================================================
// STEP 5: Set up test button (for mock mode demonstration)
// =============================================================================

/**
 * In mock mode, we can manually trigger tool requests to simulate
 * what happens when an AI app uses our tool.
 *
 * In production, tool requests come automatically from the AI app.
 */
document.getElementById('trigger-tool').addEventListener('click', () => {
  console.log('[Example] Manually triggering get_page_info tool')

  // Import the trigger function (only available in mock mode)
  import('../../packages/sdk/dist/index.js').then((sdk) => {
    // Check if triggerMockRequest is available (it's not exported by default)
    // Instead, we'll dispatch the event manually
    const requestEvent = new CustomEvent('aiii:request', {
      detail: {
        requestId: crypto.randomUUID(),
        tool: 'get_page_info',
        args: {
          includeMetadata: Math.random() > 0.5 // Randomly include metadata
        },
        origin: window.location.origin,
        aiApp: 'Mock AI App',
        timestamp: Date.now()
      },
      bubbles: true
    })

    document.dispatchEvent(requestEvent)
  })
})

// =============================================================================
// Done!
// =============================================================================

console.log('[Example] Script loaded and ready')
console.log('[Example] Try clicking the "Test Tool" button to simulate an AI request')
console.log('[Example] In production, requests would come automatically from AI apps like Claude')
