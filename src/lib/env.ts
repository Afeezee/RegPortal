import { z } from "zod";

const nonEmpty = () =>
  z
    .string()
    .transform((value) => value.trim())
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional();

const envSchema = z.object({
  DATABASE_URL: nonEmpty(),
  GROQ_API_KEY: nonEmpty(),
  NEXTAUTH_SECRET: nonEmpty(),
  NEXTAUTH_URL: nonEmpty(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsedEnv = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NODE_ENV: process.env.NODE_ENV,
});

export const env = parsedEnv;

export function hasDatabaseUrl() {
  return Boolean(env.DATABASE_URL);
}

export function hasGroqApiKey() {
  return Boolean(env.GROQ_API_KEY);
}
