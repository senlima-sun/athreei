import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import type { BetterAuthOptions } from "better-auth";

export type DatabaseProvider = "sqlite" | "pg" | "mysql";

export interface AuthConfigOptions extends Partial<BetterAuthOptions> {
  /**
   * Database provider type
   * @default "sqlite"
   */
  provider?: DatabaseProvider;
}

/**
 * Create Better Auth configuration with Drizzle adapter
 *
 * @param db - Drizzle database instance from @athreei/db
 * @param options - Additional configuration options including database provider
 */
export function createAuthConfig(
  db: Parameters<typeof drizzleAdapter>[0],
  options: AuthConfigOptions = {}
): BetterAuthOptions {
  const { provider = "sqlite", ...restOptions } = options;

  return {
    database: drizzleAdapter(db, {
      provider,
    }),

    // Email and Password authentication
    emailAndPassword: {
      enabled: true,
      // Password reset configuration (implement sendEmail function as needed)
      // sendResetPassword: async ({ user, url, token }, request) => {
      //   await sendEmail({
      //     to: user.email,
      //     subject: "Reset your password",
      //     text: `Click the link to reset your password: ${url}`,
      //   });
      // },
    },

    // Email verification (optional - implement as needed)
    // emailVerification: {
    //   sendVerificationEmail: async ({ user, url, token }, request) => {
    //     await sendEmail({
    //       to: user.email,
    //       subject: "Verify your email address",
    //       text: `Click the link to verify your email: ${url}`,
    //     });
    //   },
    // },

    // OAuth Providers (configure with environment variables)
    socialProviders: {
      // GitHub OAuth
      // Uncomment and configure with your credentials:
      // github: {
      //   clientId: process.env.GITHUB_CLIENT_ID as string,
      //   clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      // },

      // Google OAuth
      // Uncomment and configure with your credentials:
      // google: {
      //   clientId: process.env.GOOGLE_CLIENT_ID as string,
      //   clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // },
    },

    // Plugins
    plugins: [
      organization({
        // Organization creator gets owner role by default
        creatorRole: "owner",
        // Allow users to create organizations
        allowUserToCreateOrganization: true,
        // Optional: Limit organizations per user
        // organizationLimit: 5,
        // Optional: Limit members per organization
        // membershipLimit: 100,
        // Optional: Send invitation emails
        // sendInvitationEmail: async ({ email, organization, inviter, url }) => {
        //   await sendEmail({
        //     to: email,
        //     subject: `You've been invited to ${organization.name}`,
        //     text: `${inviter.name} invited you to join ${organization.name}. Click here: ${url}`,
        //   });
        // },
      }),
    ],

    // Merge any additional options
    ...restOptions,
  };
}
