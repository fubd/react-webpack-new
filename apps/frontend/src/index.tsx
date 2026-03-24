import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import faviconImage from '@/assets/favicon-mark.png';
import faviconIco from '@/assets/favicon.ico';

const upsertFaviconLink = (rel: string, href: string, type?: string) => {
  const selector = `link[rel="${rel}"]`;
  const existing = document.head.querySelector<HTMLLinkElement>(selector);
  const link = existing ?? document.createElement('link');

  link.rel = rel;
  link.href = href;

  if (type) {
    link.type = type;
  }

  if (!existing) {
    document.head.appendChild(link);
  }
};

upsertFaviconLink('icon', faviconImage, 'image/png');
upsertFaviconLink('shortcut icon', faviconIco, 'image/x-icon');

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  console.error('Failed to find the root element');
}
