/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testMatch: ['**/*.{spec,test}.ts'],
  coverageReporters: ['lcov', 'text', 'json'],
  verbose: true,
  reporters: [
    'default',
    [
      'jest-junit',
      {
        suiteName: 'jest tests',
        outputDirectory: './test-results/jest',
        outputName: 'results.xml',
      },
    ],
  ],
  coverageDirectory: './coverage',
  moduleNameMapper: {
    '~/(.*).js': '<rootDir>/src/$1.ts',
  },
  testEnvironment: 'node',
};
