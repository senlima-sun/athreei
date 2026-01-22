import { defineConfig } from "vitest/config"
import { resolve } from "path"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/index.ts"],
    },
  },
  resolve: {
    alias: {
      "@athreei/shared": resolve(__dirname, "../shared/src"),
      "@athreei/gateway-core": resolve(__dirname, "../gateway-core/src"),
    },
  },
})
