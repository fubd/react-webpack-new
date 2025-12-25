import {ThemeConfig} from 'antd';

const antdTheme: ThemeConfig = {
  cssVar: {
    prefix: 'dot', // This generates --dot-color-primary
    key: 'dot',    // Unique key for this theme scope
  },
  hashed: false, // Cleaner DOM, optional but good for debug
  token: {
    // Colors
    colorPrimary: '#0ea5e9', // Sky 500
    colorLink: '#0ea5e9',
    colorSuccess: '#10b981', // Emerald 500
    colorWarning: '#f59e0b', // Amber 500
    colorError: '#ef4444',   // Red 500
    colorInfo: '#3b82f6',    // Blue 500
    
    // Typography
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontSize: 14,
    
    // Layout
    borderRadius: 8,
    wireframe: false,
    
    // Backgrounds
    colorBgLayout: '#f8fafc',
    colorBgBase: '#ffffff',
    colorTextBase: '#1e293b',
  },
  components: {
    Button: {
      controlHeight: 40,
      borderRadius: 8,
      boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    },
    Card: {
      borderRadiusLG: 12,
      boxShadowTertiary: '0 4px 6px -1px rgb(0 0 0 / 0.1)', // Custom shadow approximation via overrides if needed, or rely on token
    },
    Menu: {
      itemBorderRadius: 6,
      itemHeight: 40,
      activeBarBorderWidth: 0, // Remove bottom border line
      itemSelectedColor: '#0ea5e9',
      itemSelectedBg: '#e0f2fe', // Sky 100 - Lighter background for selection
    },
    Layout: {
      headerBg: '#ffffff',
      bodyBg: '#f8fafc', 
    },
  },
};

export default antdTheme;
