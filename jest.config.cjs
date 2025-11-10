// jest.config.cjs

module.exports = {
  testEnvironment: 'node',
  verbose: true,
  roots: ['src', 'tests'],
    setupFiles: ['./jest.setup.js'], // ✅ Add this line

  transform: {},
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.js'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
