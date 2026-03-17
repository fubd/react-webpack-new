const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const ConsoleLogOnBuildWebpackPlugin = require('./plugins/ConsoleLogOnBuildWebpackPlugin');
const TerserPlugin = require('terser-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');

// 判断当前是否为开发模式
// process.env.NODE_ENV 在 package.json scripts 中设置
const isDev = process.env.NODE_ENV === 'development';

module.exports = {
  // 入口文件：应用程序的起点
  entry: './src/index.tsx',

  // 输出配置：打包后的文件位置和命名规则
  output: {
    // 必须是绝对路径
    path: path.resolve(__dirname, 'dist'),
    // 文件名包含内容哈希，用于浏览器缓存控制
    // 内容变了 hash 才会变，用户才会重新下载，否则使用缓存
    filename: '[name].[contenthash].js',
    // 异步 chunk 也使用内容哈希，提升长期缓存命中
    chunkFilename: '[name].[contenthash].js',
    // 每次构建前清理 dist 目录，防止旧文件堆积
    clean: true,
    // 确保资源路径始终从根路径开始，避免子路由下静态资源 404
    publicPath: '/',
  },

  // 文件系统缓存：大幅提升二次构建速度（首次构建后生效）
  cache: {
    type: 'filesystem',
  },

  module: {
    rules: [
      // 处理 JS/TS/JSX/TSX 文件
      {
        test: /\.(js|jsx|ts|tsx)$/,
        include: path.resolve(__dirname, 'src'),
        exclude: /node_modules/, // 排除 node_modules，避免重复编译库文件
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
            cacheCompression: false,
          },
        },
      },
      // 处理样式文件 (CSS/Less)
      {
        test: /\.(css|less)$/,
        use: [
          // 开发环境使用 style-loader (写入 style 标签，支持 HMR)
          // 生产环境使用 MiniCssExtractPlugin (提取为独立 CSS 文件，利于缓存)
          isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              sourceMap: isDev, // 开启 Source Map 方便调试
            },
          },
          'less-loader', // 编译 Less 为 CSS
        ],
      },
      // 处理图片、字体等资源文件
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/i,
        // Webpack 5 内置资源处理模块
        // 小于 8kb 自动转 base64 内联，减少 HTTP 请求；大于 8kb 输出独立文件
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8kb
          },
        },
      },
    ],
  },

  resolve: {
    // 引入模块时可以省略的后缀名
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    // 路径别名配置
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  plugins: [
    // 自动生成 HTML 文件并注入打包后的 JS/CSS
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),

    // 生产环境提取 CSS 为独立文件
    !isDev && new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash].css',
    }),

    // ESLint 实时检查：构建时在终端显示 lint 错误
    // 开发环境仅警告不中断，生产环境让 lint 错误阻断构建
    new ESLintPlugin({
      extensions: ['js', 'jsx', 'ts', 'tsx'],
      context: path.resolve(__dirname, 'src'),
      failOnError: !isDev,
    }),

    new ConsoleLogOnBuildWebpackPlugin(),
  ].filter(Boolean), // 过滤掉 false 的项 (开发环境不加入 MiniCssExtractPlugin)

  // 优化配置
  optimization: {
    // 将运行时代码单独拆分，提升长期缓存命中
    runtimeChunk: 'single',
    // 代码分割配置
    splitChunks: {
      chunks: 'all', // 对同步和异步代码都进行分割
      cacheGroups: {
        // 将第三方库 (node_modules) 提取到单独的 vendors chunk
        // 优点：第三方库不常变动，可以长期缓存
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: -10, // 优先级
        },
        // 提取被多次引用的公共模块
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
        // CSS 压缩（生产环境，配合 MiniCssExtractPlugin 使用）
        new CssMinimizerPlugin(),
      ],
    }),
  },

  // 开发服务器配置
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true, // 开启 gzip 压缩
    port: 3000,
    hot: true, // 热更新
    open: true, // 启动后自动打开浏览器
    // 解决 BrowserRouter 刷新 404：将所有 404 重定向回 index.html
    historyApiFallback: true,
    devMiddleware: {
      // 将开发环境下所有文件包括sourceMap写入磁盘而不是内存
      writeToDisk: false,
      publicPath: '/',
    },
  },

  // Source Map 配置
  // eval-cheap-module-source-map：开发环境首选，重新构建速度比 source-map 快很多
  // 生产环境通常不开启或使用 'hidden-source-map' 防止源码泄露
  devtool: isDev ? 'eval-cheap-module-source-map' : false,

  // 控制台输出日志控制
  stats: 'errors-only',
  infrastructureLogging: {
    level: 'error',
  },
};
