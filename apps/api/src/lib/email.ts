/**
 * Email callbacks for Better Auth integration
 *
 * Provides email sending functions for password reset and email verification
 * using Resend and React Email templates.
 */

import { sendEmail, PasswordResetEmail, VerifyEmail } from "@athreei/email"
import type { EmailCallbacks } from "@athreei/auth"

/**
 * Email callbacks to be passed to createAuth()
 */
export const emailCallbacks: EmailCallbacks = {
  sendResetPassword: async ({ user, url }) => {
    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      react: PasswordResetEmail({ url, userName: user.name }),
    })
  },

  sendVerificationEmail: async ({ user, url }) => {
    await sendEmail({
      to: user.email,
      subject: "Verify your email address",
      react: VerifyEmail({ url, userName: user.name }),
    })
  },
}
