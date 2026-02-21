/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src'],
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.json',
                jsx: 'react-jsx',
            },
        ],
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@onlyou/shared$': '<rootDir>/../shared/src',
        '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
        '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    },
    setupFiles: ['<rootDir>/jest.setup.ts'],
    testMatch: ['**/__tests__/**/*.spec.{ts,tsx}', '**/*.spec.{ts,tsx}'],
};
