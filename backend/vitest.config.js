import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['../tests/**/*.test.js'],
    env: {
      DB_FILE: '/tmp/banko-test.sqlite',
      NODE_ENV: 'test',
      JWT_SECRET: 'test_secret',
      BASE_URL: '',
    },
    pool: 'forks',
    forks: { singleFork: true },
    sequence: { concurrent: false },
  },
});
