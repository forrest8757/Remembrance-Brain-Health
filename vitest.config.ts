import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['lib/**/src/**/*.test.{ts,tsx}', 'artifacts/api-server/src/**/*.test.ts'],
    environment: 'node',
  },
});
