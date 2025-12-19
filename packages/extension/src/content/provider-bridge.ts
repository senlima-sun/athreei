/**
 * Provider bridge for website communication
 */

import type {
  AiiiToolType,
  AiiiToolArgs,
  AiiiActionBeforeDetail,
  AiiiActionAfterDetail,
} from "@athreei/shared"
import {
  dispatchReady,
  dispatchActionBefore,
  dispatchActionAfter,
  generateRequestId,
} from "./events"

export interface ActionResult<T = unknown> {
  success: boolean
  result?: T
  error?: string
}

export type ActionExecutor<TArgs extends AiiiToolArgs, TResult = unknown> = (
  args: TArgs
) => Promise<TResult>

/**
 * Bridge between extension and website provider
 * Manages action execution with before/after events
 */
export class ProviderBridge {
  private readonly version: string
  private readonly origin: string

  constructor(version: string) {
    this.version = version
    this.origin = window.location.origin
  }

  /**
   * Initialize the bridge and notify the website
   */
  init(): void {
    dispatchReady(this.version)
  }

  /**
   * Execute an action with before/after event dispatching
   * Returns the action result or throws if prevented/failed
   */
  async executeAction<TArgs extends AiiiToolArgs, TResult = unknown>(
    tool: AiiiToolType,
    args: TArgs,
    executor: ActionExecutor<TArgs, TResult>
  ): Promise<ActionResult<TResult>> {
    const requestId = generateRequestId()
    const startTime = performance.now()

    // Dispatch before event (cancelable)
    const beforeDetail: AiiiActionBeforeDetail = {
      requestId,
      tool,
      args,
      timestamp: Date.now(),
      origin: this.origin,
    }

    const { allowed, detail: modifiedDetail } =
      dispatchActionBefore(beforeDetail)

    if (!allowed) {
      const afterDetail: AiiiActionAfterDetail = {
        requestId,
        tool,
        success: false,
        error: "Action prevented by website provider",
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      }
      dispatchActionAfter(afterDetail)

      return {
        success: false,
        error: "Action prevented by website provider",
      }
    }

    // Execute action with potentially modified args
    let result: TResult | undefined
    let error: string | undefined
    let success = true

    try {
      result = await executor(modifiedDetail.args as TArgs)
    } catch (e) {
      success = false
      error = e instanceof Error ? e.message : String(e)
    }

    // Dispatch after event
    const afterDetail: AiiiActionAfterDetail = {
      requestId,
      tool,
      success,
      result,
      error,
      timestamp: Date.now(),
      duration: performance.now() - startTime,
    }
    dispatchActionAfter(afterDetail)

    return { success, result, error }
  }
}

// Singleton instance
let bridge: ProviderBridge | null = null

export function getBridge(): ProviderBridge {
  if (!bridge) {
    throw new Error("ProviderBridge not initialized. Call initBridge() first.")
  }
  return bridge
}

export function initBridge(version: string): ProviderBridge {
  bridge = new ProviderBridge(version)
  bridge.init()
  return bridge
}
