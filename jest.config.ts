import type { Config } from 'jest'

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    collectCoverageFrom: ['src/**/*.ts', '!src/test/**', '!src/mocks/**'],
    moduleNameMapper: {
        '^vscode$': '<rootDir>/src/mocks/vscode.ts',
    },
    testPathIgnorePatterns: ['<rootDir>/out/'],
}

export default config
