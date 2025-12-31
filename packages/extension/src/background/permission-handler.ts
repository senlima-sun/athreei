/**
 * Permission request handler for background script
 * Extracted for testability
 */

/**
 * Handle permission request from content script
 */
export async function handlePermissionRequest(
  message: {
    origin: string
    scope: string
    description?: string
    aiApp?: string
  },
  deps: {
    showPermissionDialogToUser: (
      origin: string,
      scope: string,
      tabId?: number
    ) => Promise<{ decision: "allow" | "deny" | "allow_once"; remember: boolean }>
    updatePermissionLevel: (
      origin: string,
      scope: string,
      level: "allowed" | "denied"
    ) => Promise<void>
    getActiveTab: () => Promise<number | undefined>
  }
): Promise<{ decision: "allow" | "deny" | "allow_once"; remember: boolean }> {
  try {
    // Get active tab for showing dialog
    const tabId = await deps.getActiveTab()

    // Show permission dialog to user
    const response = await deps.showPermissionDialogToUser(
      message.origin,
      message.scope,
      tabId
    )

    // If user wants to remember and it's not "allow_once", update permission level
    if (response.remember && response.decision !== "allow_once") {
      // Try to update permission level, but don't fail the whole request if it fails
      try {
        await deps.updatePermissionLevel(
          message.origin,
          message.scope,
          response.decision === "allow" ? "allowed" : "denied"
        )
      } catch (updateError) {
        console.error("[Background] Failed to update permission level:", updateError)
        // Continue and return the user's decision anyway
      }
    }

    // Return the response
    return {
      decision: response.decision,
      remember: response.remember,
    }
  } catch (error) {
    console.error("[Background] Permission request error:", error)
    return {
      decision: "deny",
      remember: false,
    }
  }
}
