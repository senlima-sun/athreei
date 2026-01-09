import { Hono } from "hono"

const health = new Hono()

health.get("/", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
  })
})

export default health
