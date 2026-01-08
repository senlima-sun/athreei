import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globals: true,
    coverage: {
      reporter: ["text", "html"],
      exclude: ["node_modules", "dist"],
    },
  },
})
