import type { Context } from "hono"

export type RouteHandler = (c: Context) => Promise<Response> | Response

export interface ControllerModule {
  [handlerName: string]: RouteHandler
}
