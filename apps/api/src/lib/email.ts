import { sendEmail, PasswordResetEmail, VerifyEmail } from "@athreei/email"
import type { EmailCallbacks } from "@athreei/auth"

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
