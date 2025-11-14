import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/test'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    transform: {
        '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
    },
    collectCoverageFrom: [
        'src/**/*.service.ts',
        'src/**/guards/**/*.ts',
        'src/lib/**/*.ts',
        '!src/**/dto/**',
        '!src/**/*.module.ts',
        '!src/main.ts',
        '!src/infra/**'
    ],
    coverageThreshold: {
        global: { lines: 82, statements: 82, functions: 75, branches: 65 },
    },
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
    moduleNameMapper: {
        '^src/(.*)$': '<rootDir>/src/$1',
    },
};

export default config;
