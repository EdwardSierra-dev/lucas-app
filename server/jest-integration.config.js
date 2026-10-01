/**
 * Jest config for backend integration tests (tasks 21.x).
 *
 * These specs live under test/integration/ and run against a REAL Postgres DB
 * (local Supabase by default; override with TEST_DATABASE_URL). They are kept
 * out of the default `jest` run (see jest.config.js testPathIgnorePatterns) and
 * executed via `npm run test:integration`. Run serially (maxWorkers 1) because
 * they share one database and reset its schema on boot.
 */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/test/integration/**/*.spec.ts'],
  maxWorkers: 1,
  testTimeout: 30000,
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          incremental: false,
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@lucas/types$': '<rootDir>/../packages/types/src/index.ts',
  },
};
