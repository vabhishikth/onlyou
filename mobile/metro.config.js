const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Stub out native modules during local development (metro bundler on dev machine).
// During EAS builds, EAS_BUILD=true is set and real native SDKs are compiled in.
// This prevents crashes when the dev client binary doesn't include a native module.
if (!process.env.EAS_BUILD) {
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
