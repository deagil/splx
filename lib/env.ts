/**
 * Next.js only inlines NEXT_PUBLIC_* values for static property access
 * (process.env.NEXT_PUBLIC_FOO). Dynamic process.env[name] is undefined
 * in client bundles, so public vars must be listed here explicitly.
 */
const publicEnv = {
  NEXT_PUBLIC_AGENT_RUNTIME: process.env.NEXT_PUBLIC_AGENT_RUNTIME,
  NEXT_PUBLIC_APP_MODE: process.env.NEXT_PUBLIC_APP_MODE,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
} as const;

export function requireEnv(name: string): string {
  const value =
    name in publicEnv
      ? publicEnv[name as keyof typeof publicEnv]
      : process.env[name];

  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}
