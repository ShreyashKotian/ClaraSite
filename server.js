const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Internal service binding URL injected by Vercel
const FRONTEND_DEMO_URL = process.env.FRONTEND_DEMO_URL;

// Helper to proxy requests to bound internal frontend-demo service
async function proxyToDemo(req, res, targetSubpath) {
  try {
    const base = FRONTEND_DEMO_URL.endsWith('/') ? FRONTEND_DEMO_URL : FRONTEND_DEMO_URL + '/';
    const cleanSubpath = targetSubpath.startsWith('/') ? targetSubpath.slice(1) : targetSubpath;
    const targetUrl = new URL(cleanSubpath, base);

    const originalQuery = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    if (originalQuery) {
      targetUrl.search = originalQuery;
    }

    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: {
        ...req.headers,
        host: targetUrl.host
      }
    });

    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    const bodyBuffer = Buffer.from(await response.arrayBuffer());
    res.send(bodyBuffer);
  } catch (err) {
    console.error(`[Proxy Error] Failed to proxy to ${targetSubpath}:`, err);
    res.status(502).send('Bad Gateway: Unable to reach demo service');
  }
}

if (FRONTEND_DEMO_URL) {
  // Proxy /demo and /demo/* to bound internal service
  app.use('/demo', (req, res) => {
    const subpath = req.url === '/' ? '/' : req.url;
    proxyToDemo(req, res, subpath);
  });

  // Proxy /brand/* to bound internal service
  app.use('/brand', (req, res) => {
    proxyToDemo(req, res, '/brand' + req.url);
  });
} else {
  // Local fallback: serve built demo distribution if available
  const demoDist = path.join(__dirname, 'frontend-demo/dist');
  if (fs.existsSync(demoDist)) {
    app.use('/demo', express.static(demoDist, { 
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }));
    app.use('/brand', express.static(path.join(demoDist, 'brand'), { 
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }));
  }
}

// Serve static files for marketing landing page
app.use(express.static(__dirname, { 
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache');
  }
}));

// Mock demo request endpoint
app.post('/tables/demo_requests', express.json(), (req, res) => {
  console.log('[Mock] Received demo request:', req.body);
  res.status(200).json({ success: true, message: 'Mock response recorded' });
});

// Catch-all route: serve index.html for all other requests (SPA routing)
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(indexPath);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  if (FRONTEND_DEMO_URL) {
    console.log(`Connected to internal frontend-demo service at: ${FRONTEND_DEMO_URL}`);
  }
});
