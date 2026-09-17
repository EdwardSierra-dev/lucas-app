/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/__tests__/**/*.spec.ts', '**/*.spec.ts', '**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          // Override for tests — relax incremental to avoid build info conflicts
          incremental: false,
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@lucas/types$': '<rootDir>/../packages/types/src/index.ts',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/main.ts'],
  coverageDirectory: './coverage',
};
