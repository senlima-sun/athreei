import { Button, Heading, Section, Text } from "@react-email/components"
import { BaseLayout } from "./base-layout"

interface VerifyEmailProps {
  url: string
  userName?: string
}

export function VerifyEmail({ url, userName }: VerifyEmailProps) {
  return (
    <BaseLayout preview="Verify your email address">
      <Section style={content}>
        <Heading style={heading}>Verify your email</Heading>
        <Text style={text}>Hi{userName ? ` ${userName}` : ""},</Text>
        <Text style={text}>
          Thanks for signing up! Please verify your email address by clicking
          the button below.
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href={url}>
            Verify Email
          </Button>
        </Section>
        <Text style={text}>This link will expire in 24 hours.</Text>
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
