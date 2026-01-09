import { Hono } from "hono"

const config = new Hono()

config.get("/", (c) => {
  return c.json({
    features: {
      emailVerification: !!process.env.RESEND_API_KEY,
      passwordReset: !!process.env.RESEND_API_KEY,
    },
  })
})

export default config
