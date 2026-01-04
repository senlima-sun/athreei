import { Resend } from "resend"
import type { ReactElement } from "react"

let resendClient: Resend | null = null

/**
 * Get the Resend client instance.
 * Creates a new instance if one doesn't exist.
 */
export function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set")
    }
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

export interface SendEmailOptions {
  to: string
  subject: string
  react: ReactElement
}

/**
 * Send an email using Resend.
 */
export async function sendEmail({ to, subject, react }: SendEmailOptions) {
  const resend = getResendClient()
  const fromEmail = process.env.EMAIL_FROM || "noreply@athreei.com"

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject,
    react,
  })

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`)
  }

  return data
}

/**
 * Reset the Resend client instance.
 * Useful for testing.
 */
export function resetResendClient(): void {
  resendClient = null
}
