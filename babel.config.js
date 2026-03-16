module.exports = {
  presets: [
    '@babel/preset-env',
    // runtime: 'automatic' 开启 React 17+ 新 JSX 转换
    // 编译时自动注入 JSX 相关 helper，无需在每个文件 import React
    ['@babel/preset-react', {runtime: 'automatic'}],
    '@babel/preset-typescript',
  ],
};
