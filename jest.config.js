const collectCoverage = process.env.JEST_COVERAGE === 'true';

const config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  passWithNoTests: true,
  verbose: process.env.JEST_VERBOSE === 'true',
  collectCoverage,
  coverageDirectory: 'coverage',
  testPathIgnorePatterns: ['/node_modules/'],
};

if (collectCoverage) {
  config.coverageThreshold = {
    global: {
      branches: 50,
      functions: 70,
      lines: 80,
      statements: 80,
    },
  };
}

module.exports = config;
