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
const SINGLETON_PACKAGES = [
  'react',
  'react-dom',
  'react-native',
  'react-native-web',
  'drizzle-orm',
];

// Native-only packages that must NEVER be bundled on web. They import the
// React Native bridge (BatchedBridge) which crashes in the browser.
// When platform === 'web' these are redirected to an empty stub module.
const NATIVE_ONLY_PACKAGES = [
  '@powersync/react-native',
  '@powersync/op-sqlite',
  '@op-engineering/op-sqlite',
  'react-native-quick-sqlite',
];

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const customConfig = {
  cacheVersion: 'mobile-web-v5',
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: [...assetExts.filter((ext) => ext !== 'svg'), 'wasm'],
    sourceExts: [...sourceExts, 'cjs', 'mjs', 'svg'],
    extraNodeModules: {
      // Stub out Node-only packages that must never be bundled by Metro
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
  // Monorepo node_modules relative resolution helper
  if (moduleName.startsWith('./node_modules/')) {
    const relativePath = moduleName.replace(/^\.\/node_modules\//, '');
    const absolutePath = path.resolve(
      monorepoRoot,
      'node_modules',
      relativePath,
    );
    const fs = require('fs');
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
    for (const ext of extensions) {
      const p = absolutePath + ext;
      if (fs.existsSync(p)) {
        return { filePath: p, type: 'sourceFile' };
      }
    }
    if (fs.existsSync(absolutePath)) {
      return { filePath: absolutePath, type: 'sourceFile' };
    }
  }

  // Web guard: stub native-only packages to empty module to prevent BatchedBridge crash
  if (platform === 'web') {
    const isNativeOnly = NATIVE_ONLY_PACKAGES.some(
      (pkg) => moduleName === pkg || moduleName.startsWith(pkg + '/'),
    );
    if (isNativeOnly) {
      return {
        filePath: path.resolve(__dirname, 'empty.js'),
        type: 'sourceFile',
      };
    }
  }

  const isSingleton = SINGLETON_PACKAGES.some(
    (pkg) => moduleName === pkg || moduleName.startsWith(pkg + '/'),
  );

  if (isSingleton) {
    try {
      const resolved = require.resolve(moduleName, { paths: [monorepoRoot] });
      return { filePath: resolved, type: 'sourceFile' };
    } catch {
      // fall through to normal resolution
    }
  }

  if (nxResolveRequest) {
    return nxResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = nxConfig;
