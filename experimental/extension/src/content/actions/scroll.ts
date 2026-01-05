/**
 * Scroll action executor
 */

import type { AiiiScrollArgs } from "@athreei/shared"

export interface ScrollResult {
  scrolled: boolean
  position: { x: number; y: number }
  previousPosition?: { x: number; y: number }
}

/**
 * Executes a scroll action on the page or specific element
 * Supports scrolling by direction, amount, or to absolute position
 */
export async function executeScroll(
  args: AiiiScrollArgs
): Promise<ScrollResult> {
  const target = args.selector ? document.querySelector(args.selector) : window

  if (args.selector && !target) {
    throw new Error(`Element not found: ${args.selector}`)
  }

  // Get previous position
  const previousPosition = getCurrentScrollPosition(target)

  // Calculate new scroll position
  let newX: number
  let newY: number

  if (args.x !== undefined || args.y !== undefined) {
    // Absolute positioning
    newX = args.x ?? previousPosition.x
    newY = args.y ?? previousPosition.y
  } else if (args.direction && args.amount !== undefined) {
    // Directional scrolling
    const delta = calculateScrollDelta(args.direction, args.amount)
    newX = previousPosition.x + delta.x
    newY = previousPosition.y + delta.y
  } else if (args.direction) {
    // Directional scrolling with default amount (one viewport)
    const viewportSize = getViewportSize(target)
    const delta = calculateScrollDelta(
      args.direction,
      args.direction === "up" || args.direction === "down"
        ? viewportSize.height
        : viewportSize.width
    )
    newX = previousPosition.x + delta.x
    newY = previousPosition.y + delta.y
  } else {
    throw new Error(
      "Scroll requires either x/y coordinates or direction (with optional amount)"
    )
  }

  // Perform scroll
  const behavior = args.behavior ?? "auto"

  if (target === window) {
    window.scrollTo({
      left: newX,
      top: newY,
      behavior,
    })
  } else {
    ;(target as Element).scrollTo({
      left: newX,
      top: newY,
      behavior,
    })
  }

  // Wait for smooth scroll to complete
  if (behavior === "smooth") {
    await sleep(300)
  }

  // Get final position (may be clamped by browser)
  const finalPosition = getCurrentScrollPosition(target)

  return {
    scrolled: true,
    position: finalPosition,
    previousPosition,
  }
}

/**
 * Get current scroll position of window or element
 */
function getCurrentScrollPosition(target: Window | Element | null): {
  x: number
  y: number
} {
  if (target === window || !target) {
    return {
      x: window.scrollX || window.pageXOffset,
      y: window.scrollY || window.pageYOffset,
    }
  } else {
    return {
      x: (target as Element).scrollLeft,
      y: (target as Element).scrollTop,
    }
  }
}

/**
 * Get viewport size
 */
function getViewportSize(target: Window | Element | null): {
  width: number
  height: number
} {
  if (target === window || !target) {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    }
  } else {
    const rect = (target as Element).getBoundingClientRect()
    return {
      width: rect.width,
      height: rect.height,
    }
  }
}

/**
 * Calculate scroll delta from direction and amount
 */
function calculateScrollDelta(
  direction: "up" | "down" | "left" | "right",
  amount: number
): { x: number; y: number } {
  switch (direction) {
    case "up":
      return { x: 0, y: -amount }
    case "down":
      return { x: 0, y: amount }
    case "left":
      return { x: -amount, y: 0 }
    case "right":
      return { x: amount, y: 0 }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
