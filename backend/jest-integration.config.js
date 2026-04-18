/** Integration tests: Nest TestingModule + supertest + real DB (Postgres via TEST_DATABASE_URL or DATABASE_URL). */
module.exports = {
  preset: 'ts-jest',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/integration/**/*.integration.spec.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testTimeout: 120000,
  maxWorkers: 1,
};
