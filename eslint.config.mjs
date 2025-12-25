import globals from 'globals';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

export default [
  // 继承 TypeScript 推荐规则 (放在最前面，以便后续规则可以覆盖它)
  ...tseslint.configs.recommended,
  
  {
    // 指定生效的文件类型：js, jsx, ts, tsx
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      // ECMAScript 版本
      ecmaVersion: 2021,
      // 模块类型：使用 ES Module
      sourceType: 'module',
      globals: {
        // 包含浏览器全局变量，如 window, document
        ...globals.browser,
        // 包含 Node.js 全局变量，如 process, require
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          // 启用 JSX 解析
          jsx: true,
        },
      },
    },
    plugins: {
      // React 插件，用于 React 最佳实践检查
      react: pluginReact,
      // React Hooks 插件，用于检查 Hooks 规则（如依赖项数组）
      'react-hooks': pluginReactHooks,
      // Stylistic 插件，用于替代 Prettier 进行代码格式化
      '@stylistic': stylistic,
    },
    rules: {
      // 继承 React 推荐规则
      ...pluginReact.configs.recommended.rules,
      // 继承 React Hooks 推荐规则
      ...pluginReactHooks.configs.recommended.rules,
      
      // 关闭 React 在 JSX 作用域的检查（React 17+ 不需要 import React）
      'react/react-in-jsx-scope': 'off',
      // 关闭 PropTypes 检查（使用 TypeScript 不需要 PropTypes）
      'react/prop-types': 'off',
      
      // --- 风格化规则 (Stylistic Rules) ---

      // 强制使用分号
      '@stylistic/semi': ['error', 'always'],

      // 强制使用单引号，允许字符串中包含双引号时使用双引号避免转义
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],

      // 强制缩进为 2 个空格
      '@stylistic/indent': ['error', 2],

      // 强制多行对象/数组末尾保留逗号
      '@stylistic/comma-dangle': ['error', 'always-multiline'],

      // JSX 属性强制使用双引号
      '@stylistic/jsx-quotes': ['error', 'prefer-double'],

      // 箭头函数参数必须有括号
      '@stylistic/arrow-parens': ['error', 'always'],

      // 对象大括号内的空格：关闭检查，以允许灵活的写法
      '@stylistic/object-curly-spacing': ['error', 'never'],

      // 代码块内部（如箭头函数）不使用空格
      '@stylistic/block-spacing': ['error', 'never'],
    },
    settings: {
      react: {
        // 自动检测 React 版本
        version: 'detect',
      },
    },
  },
  {
    // 针对 JS 和 MJS 文件禁用 TypeScript 特有的规则
    files: ['**/*.js', '**/*.mjs'],
    rules: {
      // 允许在 JS 文件中使用 require
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
];
