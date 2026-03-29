import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from '@rsbuild/core';
import {pluginLess} from '@rsbuild/plugin-less';
import {pluginReact} from '@rsbuild/plugin-react';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// UMD bundles hosted on a custom CDN.
// These are loaded as classic <script> tags and expose global variables
// that Rsbuild's externals will reference at runtime.
const CDN = {
  react:         'https://s.fubodong.com/react@19.2.4.js',
  reactDom:      'https://s.fubodong.com/react-dom@19.2.4.js',
  reactDomClient:'https://s.fubodong.com/react-dom-client@19.2.4.js',
};

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginLess(),
  ],
  source: {
    entry: {
      index: './src/index.tsx',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(currentDir, 'src'),
    },
  },
  html: {
    template: './public/index.html',
    title: 'Dot SaaS',
    // Inject UMD bundles before the app script so globals are available.
    tags: [
      {tag: 'script', attrs: {src: CDN.react, crossorigin: 'anonymous', defer: true}, append: false},
      {tag: 'script', attrs: {src: CDN.reactDom, crossorigin: 'anonymous', defer: true}, append: false},
      {tag: 'script', attrs: {src: CDN.reactDomClient, crossorigin: 'anonymous', defer: true}, append: false},
    ],
  },
  performance: {
    chunkSplit: {
      strategy: 'split-by-experience',
    },
  },
  output: {
    distPath: {
      root: 'dist',
    },
  },
  tools: {
    rspack: {
      // Map import paths to the global variables exposed by the UMD bundles.
      externals: {
        'react':            'React',
        'react-dom':        'ReactDOM',
        'react-dom/client': 'ReactDOMClient',
      },
    },
  },
});
