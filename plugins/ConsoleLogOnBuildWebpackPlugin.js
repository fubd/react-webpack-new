const webpack = require('webpack');
const Table = require('cli-table3');

const readline = require('readline');

class ConsoleLogOnBuildWebpackPlugin {
  apply(compiler) {
    const spinners = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];
    let spinnerIdx = 0;
    let spinnerTimer = null;
    
    const startSpinner = () => {
      if (!spinnerTimer) {
        spinnerTimer = setInterval(() => {
          spinnerIdx = (spinnerIdx + 1) % spinners.length;
        }, 80);
      }
    };
    
    const stopSpinner = () => {
      if (spinnerTimer) {
        clearInterval(spinnerTimer);
        spinnerTimer = null;
      }
    };

    const handler = (percentage, message, ...args) => {
      startSpinner();
      
      const p = Math.floor(percentage * 100);
      const argsText = args.length > 0 ? args.join(' ') : '';
      
      // Gradient bar with blocks
      const length = 25;
      const progress = Math.round(length * percentage);
      
      // Use gradient blocks for a modern look
      const blocks = ['█', '▓', '▒', '░'];
      let bar = '';
      
      for (let i = 0; i < length; i++) {
        if (i < progress) {
          bar += blocks[0];
        } else if (i === progress && percentage < 1) {
          bar += blocks[1]; // Gradient effect at the edge
        } else {
          bar += blocks[3];
        }
      }
      
      // Truncate text to fit terminal
      const cols = process.stdout.columns || 80;
      const availableSpace = Math.max(0, cols - 50);
      let content = `${message} ${argsText}`;
      
      if (content.length > availableSpace) {
        content = content.slice(0, availableSpace - 3) + '...';
      }

      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      
      // Color gradient: Blue -> Cyan -> Green as progress increases
      let barColor = '\x1b[36m'; // Cyan default
      if (percentage < 0.33) {
        barColor = '\x1b[34m'; // Blue
      } else if (percentage < 0.66) {
        barColor = '\x1b[36m'; // Cyan
      } else {
        barColor = '\x1b[32m'; // Green
      }
      
      const spinnerChar = spinners[spinnerIdx];
      process.stdout.write(`\x1b[35m${spinnerChar}\x1b[0m ${barColor}${bar}\x1b[0m \x1b[1m${p}%\x1b[0m ${content}`);
      
      if (percentage === 1) {
        process.stdout.write('\n');
        stopSpinner();
      }
    };

    new webpack.ProgressPlugin(handler).apply(compiler);
    
    compiler.hooks.done.tap('ConsoleLogOnBuildWebpackPlugin', (stats) => {
      stopSpinner();
      console.log('\n');

      const data = stats.toJson();
      const time = ((stats.endTime - stats.startTime) / 1000).toFixed(2);
      
      // Modern minimalist table with clean lines
      const table = new Table({
        head: ['\x1b[1m\x1b[36mItem\x1b[0m', '\x1b[1m\x1b[36mValue\x1b[0m'],
        chars: { 
          'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
          'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
          'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
          'right': '│', 'right-mid': '┤', 'middle': '│',
        },
        style: {
          head: [],
          border: ['cyan'],
        },
      });

      // Build Status with modern icons
      let status = '';
      let statusIcon = '';
      if (stats.hasErrors()) {
        status = '\x1b[31m\x1b[1mFailed\x1b[0m';
        statusIcon = '✗';
      } else if (stats.hasWarnings()) {
        status = '\x1b[33m\x1b[1mWarning\x1b[0m';
        statusIcon = '⚠';
      } else {
        status = '\x1b[32m\x1b[1mSuccess\x1b[0m';
        statusIcon = '✓';
      }

      table.push(
        ['Status', `${statusIcon} ${status}`],
        ['Build Time', `\x1b[35m${time}s\x1b[0m`],
        ['Webpack', `\x1b[90mv${webpack.version}\x1b[0m`],
      );

      // Add Asset Information with better formatting
      if (data.assets && data.assets.length > 0) {
        table.push([{colSpan: 2, content: '\x1b[1m\x1b[36m── Assets ──\x1b[0m', hAlign: 'center'}]);
        
        const assets = data.assets.sort((a, b) => b.size - a.size).slice(0, 5);
        
        assets.forEach((asset) => {
          const sizeKb = asset.size / 1024;
          let sizeColor = '\x1b[32m'; // Green
          let sizeIcon = '●';
          
          if (sizeKb > 500) {
            sizeColor = '\x1b[31m'; // Red
            sizeIcon = '●';
          } else if (sizeKb > 250) {
            sizeColor = '\x1b[33m'; // Yellow
            sizeIcon = '●';
          }
          
          const size = `${sizeColor}${sizeIcon}\x1b[0m ${sizeKb.toFixed(2)} KB`;
          table.push([`  ${asset.name}`, size]);
        });
        
        if (data.assets.length > 5) {
          table.push([{colSpan: 2, content: `\x1b[90m... and ${data.assets.length - 5} more\x1b[0m`, hAlign: 'center'}]);
        }
      }

      console.log(table.toString());
      console.log(''); // Extra line for spacing
      
      if (stats.hasErrors()) {
        console.log('\x1b[31m\x1b[1m✗ Errors:\x1b[0m');
        data.errors.forEach((err) => console.error(`  ${err.message}`));
      }
    });
  }
}

module.exports = ConsoleLogOnBuildWebpackPlugin;
