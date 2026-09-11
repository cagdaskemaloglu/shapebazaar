const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
// Monorepo kökü — packages/shared gibi workspace paketlerini bulabilmesi için.
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Metro'nun monorepo kökündeki değişiklikleri de izlemesini sağlar
// (örn. packages/shared içindeki bir dosya değiştiğinde hot-reload çalışsın).
config.watchFolders = [monorepoRoot];

// Hem apps/mobile/node_modules hem root node_modules'ta paket arasın
// (npm workspaces bağımlılıkları büyük ölçüde root'a hoist eder).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = withNativeWind(config, { input: "./global.css" });
