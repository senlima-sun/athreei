import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import type { ReactNode } from "react"

interface BaseLayoutProps {
  preview: string
  children: ReactNode
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logo}>athreei</Text>
          </Section>
          {children}
          <Section style={footer}>
            <Text style={footerText}>
              This email was sent by athreei. If you didn&apos;t request this,
              you can safely ignore it.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  marginBottom: "64px",
  borderRadius: "8px",
  maxWidth: "480px",
}

const logoSection = {
  padding: "0 0 32px 0",
  textAlign: "center" as const,
}

const logo = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#1a1a1a",
  margin: "0",
}

const footer = {
  padding: "32px 0 0 0",
  borderTop: "1px solid #e6e6e6",
  marginTop: "32px",
}

const footerText = {
  fontSize: "12px",
  color: "#8898aa",
  lineHeight: "16px",
  textAlign: "center" as const,
  margin: "0",
}
