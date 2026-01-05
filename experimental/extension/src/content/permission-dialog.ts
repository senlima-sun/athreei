/**
 * Permission dialog for requesting user consent before executing AI actions
 * Uses Shadow DOM for CSS isolation to prevent website styles from interfering
 */

export interface PermissionDialogOptions {
  tool: string
  toolDescription?: string
  origin: string
  aiApp: string
}

export interface PermissionResponse {
  decision: "allow" | "deny" | "allow_once"
  remember: boolean
}

const DIALOG_TIMEOUT_MS = 60000 // 60 seconds

/**
 * Get human-readable description for a tool
 */
export function getToolDescription(tool: string): string {
  const descriptions: Record<string, string> = {
    // Browser navigation and content tools
    browser_list_tabs: "List all open browser tabs",
    browser_get_active_tab: "Get information about the active tab",
    browser_navigate: "Navigate to web pages",
    browser_get_content: "Read page content",
    browser_get_elements: "Get interactive elements on the page",

    // Interaction tools
    browser_click: "Click on elements",
    browser_type: "Type text into form fields",
    browser_scroll: "Scroll the page or elements",
    browser_wait: "Wait for elements or conditions",

    // Advanced tools
    browser_screenshot: "Take screenshots",
    browser_execute_script: "Execute JavaScript code",

    // Legacy/internal tools (without browser_ prefix)
    click: "Click on elements",
    type: "Type text into form fields",
    navigate: "Navigate to web pages",
    scroll: "Scroll the page or elements",
    select: "Select options from dropdowns",
    wait: "Wait for elements or conditions",
    form: "Fill out forms",
    screenshot: "Take screenshots",
  }

  return descriptions[tool] || `Use ${tool}`
}

/**
 * Create and display a permission dialog
 * Returns a promise that resolves with the user's decision
 */
export function showPermissionDialog(
  options: PermissionDialogOptions
): Promise<PermissionResponse> {
  return new Promise((resolve) => {
    const container = createDialogContainer()
    const shadow = container.attachShadow({ mode: "closed" })

    const description =
      options.toolDescription || getToolDescription(options.tool)
    let rememberChoice = false
    let isResolved = false

    // Timeout to auto-deny after 60 seconds
    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        cleanup()
        resolve({ decision: "deny", remember: false })
      }
    }, DIALOG_TIMEOUT_MS)

    function cleanup() {
      isResolved = true
      clearTimeout(timeoutId)
      document.removeEventListener("keydown", handleEscape)
      container.remove()
    }

    function handleDecision(decision: PermissionResponse["decision"]) {
      cleanup()
      resolve({ decision, remember: rememberChoice })
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        handleDecision("deny")
      }
    }

    // Build dialog UI
    shadow.innerHTML = `
      <style>
        :host {
          all: initial;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        .overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 2147483647;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 80px;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideDown {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .dialog {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          width: 420px;
          max-width: 90vw;
          overflow: hidden;
          animation: slideDown 0.3s ease-out;
        }

        .header {
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f9fafb;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .close-btn {
          background: transparent;
          border: none;
          font-size: 24px;
          color: #6b7280;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: background-color 0.2s, color 0.2s;
        }

        .close-btn:hover {
          background: #e5e7eb;
          color: #111827;
        }

        .body {
          padding: 24px;
        }

        .ai-app {
          font-weight: 600;
          color: #111827;
          margin-bottom: 12px;
          font-size: 15px;
        }

        .action-box {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .action-label {
          font-size: 12px;
          text-transform: uppercase;
          color: #6b7280;
          font-weight: 600;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .action-description {
          font-size: 15px;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .origin {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 20px;
        }

        .origin strong {
          color: #111827;
        }

        .remember-section {
          margin-bottom: 24px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 14px;
          color: #374151;
          user-select: none;
        }

        .checkbox {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #2563eb;
        }

        .button-group {
          display: flex;
          gap: 12px;
        }

        .btn {
          flex: 1;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
          font-family: inherit;
        }

        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .btn:active {
          transform: translateY(0);
        }

        .btn-deny {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-deny:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }

        .btn-allow-once {
          background: #60a5fa;
          color: white;
        }

        .btn-allow-once:hover {
          background: #3b82f6;
        }

        .btn-allow {
          background: #2563eb;
          color: white;
        }

        .btn-allow:hover {
          background: #1d4ed8;
        }
      </style>

      <div class="overlay">
        <div class="dialog" role="dialog" aria-labelledby="dialog-title" aria-describedby="dialog-description">
          <div class="header">
            <h2 class="header-title" id="dialog-title">
              <span>AI Request</span>
            </h2>
            <button class="close-btn" aria-label="Close dialog" id="close-btn">×</button>
          </div>

          <div class="body">
            <div class="ai-app" id="dialog-description">
              <strong>${escapeHtml(options.aiApp)}</strong> wants to:
            </div>

            <div class="action-box">
              <div class="action-label">Action</div>
              <div class="action-description">
                ${escapeHtml(description)}
              </div>
            </div>

            <div class="origin">
              On: <strong>${escapeHtml(options.origin)}</strong>
            </div>

            <div class="remember-section">
              <label class="checkbox-label">
                <input type="checkbox" class="checkbox" id="remember-checkbox">
                <span>Remember my choice for this site</span>
              </label>
            </div>

            <div class="button-group">
              <button class="btn btn-deny" id="deny-btn">Deny</button>
              <button class="btn btn-allow-once" id="allow-once-btn">Allow Once</button>
              <button class="btn btn-allow" id="allow-btn">Allow</button>
            </div>
          </div>
        </div>
      </div>
    `

    // Get elements
    const rememberCheckbox = shadow.getElementById(
      "remember-checkbox"
    ) as HTMLInputElement
    const denyBtn = shadow.getElementById("deny-btn") as HTMLButtonElement
    const allowOnceBtn = shadow.getElementById(
      "allow-once-btn"
    ) as HTMLButtonElement
    const allowBtn = shadow.getElementById("allow-btn") as HTMLButtonElement
    const closeBtn = shadow.getElementById("close-btn") as HTMLButtonElement

    // Event listeners
    rememberCheckbox?.addEventListener("change", (e) => {
      rememberChoice = (e.target as HTMLInputElement).checked
    })

    denyBtn?.addEventListener("click", () => handleDecision("deny"))
    allowOnceBtn?.addEventListener("click", () => handleDecision("allow_once"))
    allowBtn?.addEventListener("click", () => handleDecision("allow"))
    closeBtn?.addEventListener("click", () => handleDecision("deny"))

    // ESC key handler
    document.addEventListener("keydown", handleEscape)

    // Prevent clicks on overlay from closing (only close button should close)
    shadow
      .querySelector(".overlay")
      ?.addEventListener("click", (e) => e.stopPropagation())

    // Append to document
    document.body.appendChild(container)

    // Focus the deny button by default (safe default)
    denyBtn?.focus()
  })
}

/**
 * Create the container element for the dialog
 */
function createDialogContainer(): HTMLDivElement {
  const container = document.createElement("div")
  container.id = `athreei-permission-dialog-${Date.now()}`
  container.style.cssText = "all: initial;"
  return container
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}
