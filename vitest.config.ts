import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 5000, // 5 seconds timeout for each test
    hookTimeout: 10000, // 10 seconds for hooks
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'html']
    }
  }
});
