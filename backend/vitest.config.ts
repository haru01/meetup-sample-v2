import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      JWT_SECRET: 'default-dev-secret',
    },
    globals: true,
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/index.ts',
        '*.config.ts',
        '*.config.js',
        'src/app.ts',
        'src/infrastructure/prisma.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@auth': path.resolve(__dirname, 'src/auth'),
      '@community': path.resolve(__dirname, 'src/community'),
      '@event': path.resolve(__dirname, 'src/event'),
      '@participation': path.resolve(__dirname, 'src/participation'),
      '@checkin': path.resolve(__dirname, 'src/checkin'),
      '@notification': path.resolve(__dirname, 'src/notification'),
    },
  },
});
