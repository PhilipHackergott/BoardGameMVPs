/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 3000 },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
