import path from 'node:path';
import { defineConfig } from 'vitest/config';

const alias = { '@': path.resolve(__dirname, 'src') };

export default defineConfig({
  resolve: { alias },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
