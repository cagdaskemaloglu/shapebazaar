module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // Diğer pluginler varsa üstte
      'react-native-reanimated/plugin', // Mutlaka en sonda olmalı
    ],
  };
};
