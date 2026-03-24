const readline = require('readline');

// ─── ANSI 颜色/样式工具 ──────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  // 前景色
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  magenta:'\x1b[35m',
  cyan:   '\x1b[36m',
  white:  '\x1b[97m',
  gray:   '\x1b[90m',
};

const paint = (color, text) => `${color}${text}${c.reset}`;
const bold  = (text)        => `${c.bold}${text}${c.reset}`;
const dim   = (text)        => `${c.dim}${text}${c.reset}`;

function formatSize(bytes) {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(2)} kB`;
}

class ConsoleLogOnBuildWebpackPlugin {
  apply(compiler) {
    const isDev = compiler.options.mode === 'development';

    // 开发环境: 只在控制台打印一行即可，不刷屏
    // 生产环境: 同样保持极简风格
    compiler.hooks.done.tap('ConsoleLogOnBuildWebpackPlugin', (stats) => {
      // 抹除原本可能存在的零碎内容，确保换行干净
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      console.log(); // 空一行

      const buildTime = ((stats.endTime - stats.startTime) / 1000).toFixed(2);
      const json = stats.toJson({ 
        assets: true, 
        chunks: false, 
        modules: false, 
      });

      // 1. 打印构建状态（错误处理保持在最前）
      if (stats.hasErrors()) {
        console.log(`  ${bold(paint(c.red, '✗ build failed'))} in ${buildTime}s\n`);
        json.errors.forEach(err => console.error(paint(c.red, `${err.message}`)));
        return;
      }

      // 2. 打印产物列表 (参考 Vite 风格)
      if (json.assets && json.assets.length > 0) {
        // 排序：JS 和 CSS 放前面，然后按大小降序
        const sortedAssets = [...json.assets].sort((a, b) => {
          const aExt = a.name.split('.').pop();
          const bExt = b.name.split('.').pop();
          if (aExt === bExt) return b.size - a.size;
          if (aExt === 'js' || aExt === 'css') return -1;
          return 1;
        });

        // 适当截断
        const maxAssets = isDev ? 10 : 20; 
        const displayed = sortedAssets.slice(0, maxAssets);

        // 统一左对齐
        const maxSizeStrLen = Math.max(...displayed.map(a => formatSize(a.size).length));

        displayed.forEach(asset => {
          const ext = asset.name.split('.').pop();
          let nameColor = c.cyan; // 默认青色
          if (ext === 'css') nameColor = c.magenta; // CSS 紫色
          else if (['png', 'jpg', 'jpeg', 'svg', 'gif'].includes(ext)) nameColor = c.green;
          else if (ext === 'html') nameColor = c.blue;

          // 大小颜色：大于 500kb 黄色警告，否则普通灰色
          let sizeColor = c.dim;
          if (asset.size > 500 * 1024) sizeColor = c.yellow;

          const sizeStr = formatSize(asset.size).padStart(maxSizeStrLen, ' ');
          
          // 输出: dist/xxxx.js       14.23 kB
          console.log(`  ${dim('dist/')}${paint(nameColor, asset.name.padEnd(45, ' '))} ${paint(sizeColor, sizeStr)}`);
        });

        if (sortedAssets.length > maxAssets) {
          console.log(`  ${dim(`... and ${sortedAssets.length - maxAssets} more assets`)}`);
        }
      }
      
      console.log(); // 留白
      
      // 3. 将成功状态移到列表底部
      console.log(`  ${bold(paint(c.green, '✓ built in'))} ${buildTime}s`);
      if (stats.hasWarnings()) {
        console.log(`  ${paint(c.yellow, `${json.warnings.length} warnings (use stats.warnings to inspect)`)}`);
      }

      console.log(); // 空一行结尾
    });
  }
}

module.exports = ConsoleLogOnBuildWebpackPlugin;
