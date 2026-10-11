// tests/contract/build.test.js
// Contract verification for static build outputs and core file integrity

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '../..');

test('Core landing page files exist and are non-empty', () => {
  const requiredFiles = [
    'index.html',
    'css/style.css',
    'js/main.js',
    'server.js',
    'package.json'
  ];

  for (const relPath of requiredFiles) {
    const fullPath = path.join(rootDir, relPath);
    assert.strictEqual(fs.existsSync(fullPath), true, `File must exist: ${relPath}`);
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 0, `File must not be empty: ${relPath}`);
  }
});

test('Compiled React demo bundle exists in frontend-demo/dist', () => {
  const distHtml = path.join(rootDir, 'frontend-demo/dist/index.html');
  assert.strictEqual(fs.existsSync(distHtml), true, 'frontend-demo/dist/index.html must exist');
  
  const htmlContent = fs.readFileSync(distHtml, 'utf-8');
  assert.ok(htmlContent.includes('<div id="root"></div>') || htmlContent.includes('id="root"'), 'dist/index.html must contain root mount container');

  const assetsDir = path.join(rootDir, 'frontend-demo/dist/assets');
  assert.strictEqual(fs.existsSync(assetsDir), true, 'dist/assets directory must exist');

  const assetFiles = fs.readdirSync(assetsDir);
  const hasJs = assetFiles.some(f => f.endsWith('.js'));
  const hasCss = assetFiles.some(f => f.endsWith('.css'));

  assert.ok(hasJs, 'dist/assets must contain compiled JavaScript bundles');
  assert.ok(hasCss, 'dist/assets must contain compiled CSS styles');
});
