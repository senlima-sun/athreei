# @athreei/email

Email templating and sending system using React Email and Resend.

## Overview

This package provides transactional email functionality for the athreei platform using [React Email](https://react.email/) for templating and [Resend](https://resend.com/) for delivery.

## Installation

```bash
bun install

# Build the package
bun run build
```

## Exports

| Export                     | Description                |
| -------------------------- | -------------------------- |
| `@athreei/email`           | Email client and utilities |
| `@athreei/email/templates` | Email template components  |

## Usage

### Sending Emails

```typescript
import { sendEmail } from "@athreei/email"
import { VerifyEmailTemplate } from "@athreei/email/templates"

await sendEmail({
  to: "user@example.com",
  subject: "Verify your email",
  react: VerifyEmailTemplate({
    verificationUrl: "https://example.com/verify?token=abc123",
    userName: "John",
  }),
})
```

### Available Templates

#### VerifyEmailTemplate

Sent when users need to verify their email address.

```typescript
import { VerifyEmailTemplate } from "@athreei/email/templates";

<VerifyEmailTemplate
  verificationUrl="https://..."
  userName="John"
/>
```

#### PasswordResetTemplate

Sent when users request a password reset.

```typescript
import { PasswordResetTemplate } from "@athreei/email/templates";

<PasswordResetTemplate
  resetUrl="https://..."
  userName="John"
  expiresIn="1 hour"
/>
```

### Getting the Resend Client

For advanced use cases, access the Resend client directly:

```typescript
import { getResendClient } from "@athreei/email"

const resend = getResendClient()

// Use Resend API directly
await resend.emails.send({
  from: "onboarding@athreei.com",
  to: "user@example.com",
  subject: "Custom email",
  html: "<p>Hello!</p>",
})
```

## Configuration

### Environment Variables

| Variable         | Description            | Required                               |
| ---------------- | ---------------------- | -------------------------------------- |
| `RESEND_API_KEY` | Resend API key         | Yes                                    |
| `EMAIL_FROM`     | Default sender address | No (defaults to `noreply@athreei.com`) |

## Directory Structure

```
src/
├── index.ts              # Main entry point
├── client.ts             # Resend client wrapper
└── templates/
    ├── index.ts          # Template exports
    ├── base-layout.tsx   # Shared base layout
    ├── verify-email.tsx  # Email verification template
    └── password-reset.tsx # Password reset template
```

## Commands

```bash
# Build the package
bun run build

# Watch mode
bun run dev

# Type check
bun run typecheck

# Preview emails in browser
bun run email:dev
```

## Email Preview

Use the React Email preview server to design and test templates:

```bash
bun run email:dev
```

This opens a browser at `http://localhost:3030` where you can:

- View all email templates
- See rendered HTML
- Test responsive layouts
- Preview dark/light modes

## API Reference

### `sendEmail(options)`

Sends an email using Resend.

```typescript
interface SendEmailOptions {
  to: string | string[]
  subject: string
  react: React.ReactNode
  from?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
}
```

### `getResendClient()`

Returns the Resend client instance.

**Returns:** Resend client

### `resetResendClient()`

Resets the Resend client singleton. Useful for testing.

## Creating New Templates

1. Create a new file in `src/templates/`:

```tsx
// src/templates/welcome.tsx
import { BaseLayout } from "./base-layout"
import { Text, Button } from "@react-email/components"

interface WelcomeEmailProps {
  userName: string
  dashboardUrl: string
}

export function WelcomeEmailTemplate({
  userName,
  dashboardUrl,
}: WelcomeEmailProps) {
  return (
    <BaseLayout title="Welcome to athreei">
      <Text>Hi {userName},</Text>
      <Text>Welcome to athreei! Get started by exploring your dashboard.</Text>
      <Button href={dashboardUrl}>Open Dashboard</Button>
    </BaseLayout>
  )
}
```

2. Export from `src/templates/index.ts`:

```typescript
export { WelcomeEmailTemplate } from "./welcome"
```

3. Build and use:

```bash
bun run build
```

## Dependencies

- **react** - JSX templating
- **@react-email/components** - Email components
- **resend** - Email delivery API

## Dev Dependencies

- **react-email** - Development preview server

## Related Packages

- `@athreei/auth` - Auth with email verification
- `apps/api` - API server that sends emails
- `apps/platform` - Platform with email-related UI
