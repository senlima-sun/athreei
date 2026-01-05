/**
 * Popup script for athreei extension
 * Shows connection status to native host
 */

const statusDot = document.getElementById("statusDot")
const statusText = document.getElementById("statusText")

async function checkConnection() {
  try {
    // Check connection status from background script
    const response = await chrome.runtime.sendMessage({
      type: "get_connection_status",
    })

    if (response?.connected) {
      statusDot?.classList.remove("disconnected")
      statusText!.textContent = "Connected to native host"
    } else {
      statusDot?.classList.add("disconnected")
      statusText!.textContent = "Native host not connected"
    }
  } catch (error) {
    statusDot?.classList.add("disconnected")
    statusText!.textContent = "Extension error"
    console.error("Popup error:", error)
  }
}

// Check connection on popup open
checkConnection()
