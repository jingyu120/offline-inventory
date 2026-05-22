module.exports = function (api) {
  api.cache(true);
  return {
    // Suppress "loose mode" incompatibility warnings from Babel 7.13+.
    // These three plugins must all agree on the same assumption values,
    // or Babel emits a large warning block for every compiled file.
    assumptions: {
      setPublicClassFields: true,
      privateFieldsAsProperties: true,
    },
    presets: ['babel-preset-expo'],
    plugins: [
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      ['@babel/plugin-transform-class-properties', { loose: true }],
      ['@babel/plugin-transform-private-methods', { loose: true }],
      ['@babel/plugin-transform-private-property-in-object', { loose: true }],
    ],
  };
};
