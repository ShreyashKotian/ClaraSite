const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Serve demo frontend
app.use('/demo', express.static(path.join(__dirname, 'frontend-demo/dist'), { 
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-cache');
  }
}));

// Serve brand assets directly
app.use('/brand', express.static(path.join(__dirname, 'frontend-demo/dist/brand'), { 
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-cache');
  }
}));

// Serve static files, but don't send 404 on missing files
app.use(express.static(__dirname, { 
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-cache');
  }
}));

// Catch-all route: serve index.html for all other requests (SPA routing)
app.post('/tables/demo_requests', express.json(), (req, res) => {
  console.log('[Mock] Received demo request:', req.body);
  res.status(200).json({ success: true, message: 'Mock response recorded' });
});

app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(indexPath);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
