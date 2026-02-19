const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// Find the project root (monorepo root)
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Keep React pinned to the app copy to avoid duplicate React instances in monorepo bundles.
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-dom": path.resolve(projectRoot, "node_modules/react-dom"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
};

const PINNED_CORE_MODULES = new Set(["react", "react-dom", "react-native"]);
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (PINNED_CORE_MODULES.has(moduleName)) {
    const pinnedPath = require.resolve(moduleName, {
      paths: [path.resolve(projectRoot, "node_modules")],
    });
    return { type: "sourceFile", filePath: pinnedPath };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
