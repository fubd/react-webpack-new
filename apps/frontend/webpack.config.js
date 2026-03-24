const path = require('path');
const dotenv = require('dotenv');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const ConsoleLogOnBuildWebpackPlugin = require('./plugins/ConsoleLogOnBuildWebpackPlugin');

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
});

const isDev = process.env.NODE_ENV === 'development';
const reactVendorPattern = /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/;
const routerVendorPattern = /[\\/]node_modules[\\/](react-router|react-router-dom)[\\/]/;
const uiVendorPattern = /[\\/]node_modules[\\/](antd|@ant-design|@rc-component|rc-[^\\/]+)[\\/]/;

module.exports = {
  entry: path.resolve(__dirname, './src/index.tsx'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].js',
    clean: true,
    publicPath: '/',
  },
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [
        __filename,
        path.resolve(__dirname, 'babel.config.js'),
      ],
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        include: path.resolve(__dirname, 'src'),
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
            cacheCompression: false,
          },
        },
      },
      {
        test: /\.(css|less)$/,
        use: [
          isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              sourceMap: isDev,
            },
          },
          'less-loader',
        ],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|ico)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024,
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, './public/index.html'),
    }),
    !isDev && new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash].css',
    }),
    new ESLintPlugin({
      extensions: ['js', 'jsx', 'ts', 'tsx'],
      context: path.resolve(__dirname, 'src'),
      failOnError: !isDev,
    }),
    new ConsoleLogOnBuildWebpackPlugin(),
  ].filter(Boolean),
  optimization: {
    moduleIds: 'deterministic',
    chunkIds: 'deterministic',
    runtimeChunk: 'single',
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: 20,
      maxAsyncRequests: 20,
      cacheGroups: {
        reactVendor: {
          test: reactVendorPattern,
          name: 'react-vendor',
          priority: 40,
          enforce: true,
        },
        routerVendor: {
          test: routerVendorPattern,
          name: 'router-vendor',
          priority: 30,
          enforce: true,
        },
        uiShell: {
          test: uiVendorPattern,
          name: 'ui-shell',
          chunks: 'initial',
          priority: 20,
          enforce: true,
        },
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          chunks: 'async',
          priority: -10,
          reuseExistingChunk: true,
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    },
    ...(isDev ? {} : {
      minimize: true,
      minimizer: [
        new TerserPlugin({extractComments: false}),
        new CssMinimizerPlugin(),
      ],
    }),
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: Number(process.env.FRONTEND_PORT ?? 26030),
    hot: true,
    open: false,
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.BACKEND_PORT ?? 26031}`,
        changeOrigin: true,
      },
    },
    devMiddleware: {
      writeToDisk: false,
      publicPath: '/',
    },
  },
  devtool: isDev ? 'eval-cheap-module-source-map' : false,
  performance: isDev ? false : {
    hints: 'warning',
    maxEntrypointSize: 512 * 1024,
    maxAssetSize: 256 * 1024,
  },
  stats: 'errors-only',
  infrastructureLogging: {
    level: 'error',
  },
};
