// Loads .env.local for test runners (Next.js does this for the app itself).
try {
  process.loadEnvFile(".env.local")
} catch {
  throw new Error(
    "Missing .env.local. Copy .env.example and fill in the Supabase values.",
  )
}
