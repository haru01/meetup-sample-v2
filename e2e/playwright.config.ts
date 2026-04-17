import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
  },
  webServer: [
    {
      command: "cd ../backend && npx tsx src/index.ts",
      port: 3000,
      reuseExistingServer: true,
      env: { DATABASE_URL: "file:./prisma/dev.db", JWT_SECRET: "dev-secret" },
    },
    {
      command: "cd ../frontend && npm run dev",
      port: 5173,
      reuseExistingServer: true,
    },
  ],
});
