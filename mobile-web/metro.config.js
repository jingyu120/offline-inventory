const { withNxMetro } = require('@nx/expo');
const { getDefaultConfig } = require('@expo/metro-config');
const { mergeConfig } = require('metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

// Monorepo root — one directory above mobile-web/
const monorepoRoot = path.resolve(__dirname, '..');

// Packages that must exist as a single instance. Metro resolves modules by
// walking up from the importing file, so mobile-web/node_modules/react gets
// picked up before the root copy. We override this AFTER withNxMetro so our
// resolver composes on top of whatever NX sets (rather than being overwritten).
const SINGLETON_PACKAGES = ['react', 'react-dom', 'react-native', 'react-native-web'];

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const customConfig = {
  cacheVersion: 'mobile-web-v3',
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...sourceExts, 'cjs', 'mjs', 'svg'],
    extraNodeModules: {
      'better-sqlite3': path.resolve(__dirname, 'empty.js'),
    },
  },
};

// Apply withNxMetro first — it sets up workspace lib resolution and may set
// its own resolveRequest. We capture that resolver so we can chain it.
const nxConfig = withNxMetro(mergeConfig(defaultConfig, customConfig), {
  debug: false,
  extensions: [],
  watchFolders: [path.resolve(monorepoRoot, 'node_modules')],
});

// Capture whatever resolveRequest withNxMetro installed (if any), then replace
// it with our singleton-pinning resolver that delegates to it for everything else.
const nxResolveRequest = nxConfig.resolver?.resolveRequest;

nxConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  const isSingleton = SINGLETON_PACKAGES.some(
    (pkg) => moduleName === pkg || moduleName.startsWith(pkg + '/'),
  );

  if (isSingleton) {
    try {
      const resolved = require.resolve(moduleName, { paths: [monorepoRoot] });
      return { filePath: resolved, type: 'sourceFile' };
    } catch (_) {
      // fall through to normal resolution
    }
  }

  if (nxResolveRequest) {
    return nxResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = nxConfig;
