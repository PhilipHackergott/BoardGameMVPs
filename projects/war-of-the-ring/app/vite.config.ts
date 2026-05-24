import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Web MVP. Dev + preview both pinned to 3005 (operator runs the playtest there).
export default defineConfig({
  plugins: [react()],
  server: { port: 3005, strictPort: true },
  preview: { port: 3005, strictPort: true },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
