module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo already applies the class-properties / private-methods /
    // private-property-in-object transforms with `loose: true`. We deliberately
    // do NOT add a top-level `assumptions` block or re-declare those plugins:
    // doing so conflicts with the preset's `loose` and makes Babel emit a large
    // warning block for every compiled file.
    presets: ['babel-preset-expo'],
    plugins: [['@babel/plugin-proposal-decorators', { legacy: true }]],
  };
};
