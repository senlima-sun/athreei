import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  type AuthResponse,
  type ErrorResponse,
} from "../types"
import {
  registerAccount,
  loginAccount,
  deleteUserAccount,
} from "../services/auth"
import { authMiddleware, getAuthContext } from "../middleware/auth"

const auth = new Hono()

// Register new account
auth.post("/register", zValidator("json", RegisterRequestSchema), async (c) => {
  try {
    const { email, password } = c.req.valid("json")
    const result = await registerAccount(email, password)
    return c.json<AuthResponse>(result, 201)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Registration failed"
    return c.json<ErrorResponse>({ error: message }, 400)
  }
})

// Login
auth.post("/login", zValidator("json", LoginRequestSchema), async (c) => {
  try {
    const { email, password } = c.req.valid("json")
    const result = await loginAccount(email, password)
    return c.json<AuthResponse>(result, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed"
    return c.json<ErrorResponse>({ error: message }, 401)
  }
})

// Logout (client-side token deletion, but we can add token blacklisting later)
auth.post("/logout", authMiddleware, async (c) => {
  // For now, logout is handled client-side by deleting the token
  // In production, you might want to implement token blacklisting
  return c.json({ message: "Logged out successfully" }, 200)
})

// Delete account
auth.delete("/account", authMiddleware, async (c) => {
  try {
    const { accountId } = getAuthContext(c)
    await deleteUserAccount(accountId)
    return c.json({ message: "Account deleted successfully" }, 200)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete account"
    return c.json<ErrorResponse>({ error: message }, 500)
  }
})

export default auth
