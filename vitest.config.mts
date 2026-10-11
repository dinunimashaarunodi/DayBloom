import path from "node:path"
import { defineConfig } from "vitest/config"

const alias = { "@": path.resolve(import.meta.dirname, "src") }

export default defineConfig({
  test: {
    projects: [
      {
        // Fast, offline tests for pure logic. Run by `npm test`.
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
          // A deliberately unusual machine timezone (UTC+12:45/+13:45, with DST)
          // so any code that accidentally uses the system timezone fails.
          env: { TZ: "Pacific/Chatham" },
        },
      },
      {
        // Talks to the linked Supabase dev project. Run by `npm run test:db`.
        resolve: { alias },
        test: {
          name: "db",
          environment: "node",
          include: ["tests/db/**/*.test.ts"],
          setupFiles: ["tests/load-env.ts"],
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
})
