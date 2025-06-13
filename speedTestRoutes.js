const express = require('express');
const router = express.Router();
const path = require('path');

// Generate random data for download test
function generateRandomData(size) {
  const data = Buffer.alloc(size);
  for (let i = 0; i < size; i++) {
    data[i] = Math.floor(Math.random() * 256);
  }
  return data;
}

// Ping endpoint - measures latency
router.get('/ping', (req, res) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.send('pong');
});

// Download test endpoint - sends random data
router.get('/download', (req, res) => {
  const size = 2 * 1024 * 1024; // 2MB test file
  const data = generateRandomData(size);
  
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Content-Type': 'application/octet-stream',
    'Content-Length': size.toString(),
    'Content-Disposition': 'attachment; filename=speedtest.dat'
  });
  
  res.send(data);
});

// Upload test endpoint - receives and discards data
router.post('/upload', express.raw({ type: '*/*', limit: '10mb' }), (req, res) => {
  const bytesReceived = req.body.length;
  
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.json({ status: 'success', bytesReceived });
});


module.exports = router;