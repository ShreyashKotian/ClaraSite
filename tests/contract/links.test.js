// tests/contract/links.test.js
// Contract verification for static local asset references and anchors in index.html

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '../..');
const indexPath = path.join(rootDir, 'index.html');

test('All local asset references in index.html exist on disk', () => {
  const html = fs.readFileSync(indexPath, 'utf-8');

  // Match src="..." and href="..."
  const attrRegex = /(?:src|href)=["']([^"']+)["']/g;
  let match;
  const missingAssets = [];

  while ((match = attrRegex.exec(html)) !== null) {
    const url = match[1];

    // Skip external URLs, protocol-relative URLs, hashes, tel:, mailto:, data:
    if (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('//') ||
      url.startsWith('#') ||
      url.startsWith('tel:') ||
      url.startsWith('mailto:') ||
      url.startsWith('data:') ||
      url.startsWith('javascript:')
    ) {
      continue;
    }

    // Strip query parameters or hashes
    const cleanPath = url.split('?')[0].split('#')[0];
    if (!cleanPath) continue;

    // Handle relative paths starting with /
    let localPath;
    if (cleanPath.startsWith('/brand')) {
      localPath = path.join(rootDir, 'frontend-demo/dist', cleanPath);
    } else if (cleanPath.startsWith('/demo')) {
      localPath = path.join(rootDir, 'frontend-demo/dist', cleanPath.replace(/^\/demo/, ''));
    } else if (cleanPath.startsWith('/')) {
      localPath = path.join(rootDir, cleanPath.slice(1));
    } else {
      localPath = path.join(rootDir, cleanPath);
    }

    // If localPath is directory, check index.html in directory
    if (fs.existsSync(localPath) && fs.statSync(localPath).isDirectory()) {
      localPath = path.join(localPath, 'index.html');
    }

    if (!fs.existsSync(localPath)) {
      missingAssets.push({ url, resolved: localPath });
    }
  }

  assert.deepStrictEqual(missingAssets, [], `Missing local assets found in index.html: ${JSON.stringify(missingAssets)}`);
});
