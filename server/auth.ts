import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

const devTrustedOrigins =
  process.env.NODE_ENV !== "production" ? ["http://localhost:*", "http://127.0.0.1:*"] : [];

const configuredOrigins = [
  process.env.BETTER_AUTH_URL,
  ...(process.env.TRUSTED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? []),
].filter((origin): origin is string => Boolean(origin));

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  trustedOrigins: [...devTrustedOrigins, ...configuredOrigins],
  user: {
    additionalFields: {
      role: {
        type: ["user", "admin"] as ("user" | "admin")[],
        required: true,
        defaultValue: "user",
        input: false,
      },
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": {
        window: 60,
        max: 10,
      },
      "/sign-up/email": {
        window: 60,
        max: 10,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    async sendResetPassword({ user, url }) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[Auth] Reset password link for ${user.email}: ${url}`);
      }
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url }) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[Auth] Verification link for ${user.email}: ${url}`);
      }
    },
  },
});
