import { Hono } from "hono"
import { getAuth } from "../lib/auth"

const auth = new Hono()

auth.all("/:path{.*}", async (c) => {
  const authInstance = getAuth()
  return authInstance.handler(c.req.raw)
})

auth.all("/", async (c) => {
  const authInstance = getAuth()
  return authInstance.handler(c.req.raw)
})

export default auth
