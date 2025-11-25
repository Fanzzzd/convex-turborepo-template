/**
 * Environment variable validation for Convex backend
 * Import this module to ensure all required env vars are set
 */

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Get validated environment variables
 * Call this at the start of any function that needs env vars
 */
export function getEnv() {
  return {
    // WorkOS Authentication
    WORKOS_CLIENT_ID: getRequiredEnv("WORKOS_CLIENT_ID"),
    WORKOS_API_KEY: getRequiredEnv("WORKOS_API_KEY"),
    WORKOS_WEBHOOK_SECRET: getRequiredEnv("WORKOS_WEBHOOK_SECRET"),
  } as const;
}

/**
 * Type for the validated environment
 */
export type Env = ReturnType<typeof getEnv>;

/**
 * Get a single environment variable with validation
 */
export const env = {
  get WORKOS_CLIENT_ID() {
    return getRequiredEnv("WORKOS_CLIENT_ID");
  },
  get WORKOS_API_KEY() {
    return getRequiredEnv("WORKOS_API_KEY");
  },
  get WORKOS_WEBHOOK_SECRET() {
    return getRequiredEnv("WORKOS_WEBHOOK_SECRET");
  },
} as const;

