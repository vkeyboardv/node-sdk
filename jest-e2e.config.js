/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testMatch: ['**/*.{e2e-spec,e2e-test}.ts'],
  testEnvironment: 'node',
};
