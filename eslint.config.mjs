import globals from 'globals';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

export default [
  // 继承 TypeScript 推荐规则 (放在最前面，以便后续规则可以覆盖)
  ...tseslint.configs.recommended,

  {
    files: ['apps/frontend/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react: pluginReact,
      'react-hooks': pluginReactHooks,
      '@stylistic': stylistic,
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/indent': ['error', 2],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/jsx-quotes': ['error', 'prefer-double'],
      '@stylistic/arrow-parens': 0,
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }],
      '@stylistic/array-bracket-spacing': ['error', 'never'],
      '@stylistic/comma-spacing': ['error', { before: false, after: true }],
      '@stylistic/no-multi-spaces': ['error'],
      '@stylistic/space-in-parens': ['error', 'never'],
      '@stylistic/object-curly-newline': ['error', {
        ImportDeclaration: { multiline: true, consistent: true },
        ExportDeclaration: { multiline: true, consistent: true },
      }],
      '@stylistic/no-trailing-spaces': ['error'],
      '@stylistic/object-curly-spacing': ['error', 'never'],
      '@stylistic/block-spacing': ['error', 'never'],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['apps/backend/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/indent': ['error', 2],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/arrow-parens': 0,
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }],
      '@stylistic/array-bracket-spacing': ['error', 'never'],
      '@stylistic/comma-spacing': ['error', { before: false, after: true }],
      '@stylistic/no-multi-spaces': ['error'],
      '@stylistic/space-in-parens': ['error', 'never'],
      '@stylistic/no-trailing-spaces': ['error'],
      '@stylistic/object-curly-spacing': ['error', 'never'],
      '@stylistic/block-spacing': ['error', 'never'],
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
];
