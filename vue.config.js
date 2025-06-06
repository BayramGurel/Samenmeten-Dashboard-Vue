// const { defineConfig } = require('@vue/cli-service')
// module.exports = defineConfig({
//   transpileDependencies: true
// })

const { defineConfig } = require('@vue/cli-service');
const webpack = require('webpack');

module.exports = defineConfig({
  publicPath: './',
  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
      }),
    ],
  },
});


// const { defineConfig } = require('@vue/cli-service');
// const webpack = require('webpack');
//
// module.exports = defineConfig({
//   configureWebpack: {
//     plugins: [
//       new webpack.DefinePlugin({
//         __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
//       }),
//     ],
//   },
//   devServer: {
//     headers: {
//       'Access-Control-Allow-Origin': '*',
//     },
//     https: true,
//     hot: true,
//   },
// });
