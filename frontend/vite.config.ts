import { defineConfig } from "vite";

// GitHub Pages serves project pages at /<repo-name>/, so asset URLs in the
// built index.html need that prefix. Local dev (`npm run dev`) and the
// Vitest run want the default "/" base. The deploy workflow sets BASE_PATH
// to "/Nordeus-FullStack-2026/" so prod builds resolve correctly.
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  server: {
    port: 3000,
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
  build: { outDir: "dist" },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
  },
});
