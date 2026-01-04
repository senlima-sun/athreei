import { Button, Heading, Section, Text } from "@react-email/components"
import { BaseLayout } from "./base-layout"

interface PasswordResetEmailProps {
  url: string
  userName?: string
}

export function PasswordResetEmail({ url, userName }: PasswordResetEmailProps) {
  return (
    <BaseLayout preview="Reset your password">
      <Section style={content}>
        <Heading style={heading}>Reset your password</Heading>
        <Text style={text}>Hi{userName ? ` ${userName}` : ""},</Text>
        <Text style={text}>
          We received a request to reset your password. Click the button below
          to choose a new password.
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href={url}>
            Reset Password
          </Button>
        </Section>
        <Text style={text}>
          This link will expire in 1 hour. If you didn&apos;t request a password
          reset, you can ignore this email.
        </Text>
        <Text style={linkText}>
          Or copy and paste this URL into your browser:{" "}
          <span style={urlStyle}>{url}</span>
        </Text>
      </Section>
    </BaseLayout>
  )
}

const content = {
  padding: "0",
}

const heading = {
  fontSize: "24px",
  fontWeight: "600",
  color: "#1a1a1a",
  margin: "0 0 24px 0",
  textAlign: "center" as const,
}

const text = {
  fontSize: "14px",
  color: "#525f7f",
  lineHeight: "24px",
  margin: "0 0 16px 0",
}

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
}

const button = {
  backgroundColor: "#1a1a1a",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
}

const linkText = {
  fontSize: "12px",
  color: "#8898aa",
  lineHeight: "20px",
  margin: "24px 0 0 0",
}

const urlStyle = {
  color: "#525f7f",
  wordBreak: "break-all" as const,
}
