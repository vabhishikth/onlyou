module.exports = {
    preset: 'jest-expo',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    transformIgnorePatterns: [
        // Exclude everything EXCEPT these packages from transformation
        '<rootDir>/node_modules/(?!(' +
            'react-native|' +
            '@react-native|' +
            'expo|' +
            '@expo|' +
            'expo-modules-core|' +
            '@expo-google-fonts|' +
            'react-navigation|' +
            '@react-navigation|' +
            '@unimodules|' +
            'unimodules|' +
            'native-base|' +
            'react-native-svg|' +
            'lucide-react-native|' +
            'react-native-reanimated|' +
            'expo-haptics|' +
            'expo-font|' +
            'expo-linear-gradient|' +
            'react-native-safe-area-context' +
        '))',
        // Also transform packages in pnpm's .pnpm folder (monorepo structure)
        '<rootDir>/../node_modules/\\.pnpm/(?!(' +
            'react-native|' +
            '@react-native|' +
            'expo|' +
            '@expo|' +
            'expo-modules-core|' +
            '@expo-google-fonts|' +
            'lucide-react-native|' +
            'react-native-reanimated|' +
            'react-native-svg|' +
            'react-native-safe-area-context' +
        '))',
    ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/index.ts',
    ],
};
