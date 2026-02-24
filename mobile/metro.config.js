const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Stub out native modules ONLY when running with Expo Go (set EXPO_GO=1)
// In EAS development builds, the real native SDKs are available
// Usage: EXPO_GO=1 npx expo start  (for Expo Go testing without native modules)
if (process.env.EXPO_GO === '1') {
    const nativeModuleStubs = {
        '@100mslive/react-native-hms': path.resolve(__dirname, 'src/stubs/100ms-hms.ts'),
        'react-native-razorpay': path.resolve(__dirname, 'src/stubs/razorpay.ts'),
    };

    const originalResolveRequest = config.resolver.resolveRequest;
    config.resolver.resolveRequest = (context, moduleName, platform) => {
        if (nativeModuleStubs[moduleName]) {
            return {
                filePath: nativeModuleStubs[moduleName],
                type: 'sourceFile',
            };
        }
        if (originalResolveRequest) {
            return originalResolveRequest(context, moduleName, platform);
        }
        return context.resolveRequest(context, moduleName, platform);
    };
}

module.exports = withNativeWind(config, { input: './global.css' });
