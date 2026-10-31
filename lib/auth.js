import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import nodemailer from "nodemailer";
import { getDatabase } from "./db/mongodb.js";

let authPromise;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value)
    throw new Error(`Missing required authentication setting: ${name}`);
  return value;
}

async function sendEmail({ to, subject, text }) {
  const transporter = nodemailer.createTransport({
    host: requiredEnv("SMTP_HOST"),
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: requiredEnv("SMTP_USER"),
      pass: requiredEnv("SMTP_PASSWORD"),
    },
  });
  await transporter.sendMail({
    from: requiredEnv("SMTP_FROM"),
    to,
    subject,
    text,
  });
}

async function createAuth() {
  const [secret, baseURL, googleClientId, googleClientSecret] = [
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
  ].map(requiredEnv);
  const database = await getDatabase();

  return betterAuth({
    secret,
    baseURL,
    database: mongodbAdapter(database),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Reset your FX Compare password",
          text: `Use this link to reset your password:\n\n${url}\n\nIf you did not request a password reset, you can ignore this email.`,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Verify your FX Compare email",
          text: `Verify your email address to access FX Compare:\n\n${url}`,
        });
      },
    },
    socialProviders: {
      google: {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        requireEmailVerification: true,
      },
    },
  });
}

export function getAuth() {
  authPromise ??= createAuth().catch((error) => {
    authPromise = undefined;
    throw error;
  });
  return authPromise;
}
