module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['<rootDir>/test/fixtures'],
  coveragePathIgnorePatterns: [
    '<rootDir>/test/',
    '<rootDir>/src/modules/_public/'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  forceExit: true,
  coverageDirectory: '<rootDir>/coverage'
};