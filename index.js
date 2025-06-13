require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const app = express();
const { GoogleAuth } = require('google-auth-library');

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
  });
}
// CORS Configuration
app.use(cors({
  origin: ['http://localhost:3000', 'https://local-net-front-f9peth4fg-dixitji002s-projects.vercel.app','https://local-net-front-end.vercel.app','https://localnetinfo.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});
// Google Sheets Authentication
const keyFilePath = path.join(__dirname, 'service-account.json');


const credentials = {
  type: process.env.GOOGLE_TYPE,
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: Buffer.from(process.env.GOOGLE_PRIVATE_KEY_BASE64, 'base64').toString('utf-8'),
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: process.env.GOOGLE_AUTH_URI,
  token_uri: process.env.GOOGLE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN
};

const auth = new GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

// Test the auth
async function testAuth() {
  try {
    const client = await auth.getClient();
    console.log('Authentication successful!');
    return client;
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}

// Speed Test Routes
app.get('/api/speedtest/ping', (req, res) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.send('pong');
});

app.get('/api/speedtest/download', (req, res) => {
  const size = 10 * 1024 * 1024; // 10 MB
  const chunkSize = 64 * 1024; // 64 KB

  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': 'attachment; filename=speedtest.dat',
    'Content-Length': size.toString()
  });

  let bytesSent = 0;

  const sendChunk = () => {
    if (bytesSent >= size) {
      return res.end();
    }

    const currentChunkSize = Math.min(chunkSize, size - bytesSent);
    const chunk = Buffer.alloc(currentChunkSize);
    for (let i = 0; i < chunk.length; i++) {
      chunk[i] = Math.floor(Math.random() * 256);
    }

    res.write(chunk);
    bytesSent += currentChunkSize;
    process.nextTick(sendChunk);
  };

  sendChunk();
});

// Fixed Upload Route - Combined middleware and handler
app.post('/api/speedtest/upload', 
  express.raw({ type: 'application/octet-stream', limit: '10mb' }),
  (req, res) => {
    const bytesReceived = req.body?.length;
    const serverUploadEnd = Date.now();
    res.json({ 
      status: 'success', 
      bytesReceived,
      serverTimestamp: serverUploadEnd
    });
  }
);

// Serve frontend in production



app.post('/api/submit', async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.name || !req.body.email || !req.body.address || !req.body.provider || !req.body.issue) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const sheets = google.sheets({ version: 'v4', auth });
    const data = req.body;

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Sheet1!A:I',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [
          [
            new Date().toISOString(),
            data.name,
            data.email,
            data.address,
            data.provider,
            data.issue,
            data.internetSpeed || 'Not provided',
            data.description || 'No description',
            data.screenshotUrl || 'No screenshot'
          ]
        ]
      }
    });

    res.status(200).json({ success: true, result: response.data });
  } catch (err) {
    console.error('Submission error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Data Fetching Endpoint
app.get('/api/data', async (req, res) => {
  try {
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Sheet1!A2:I',
    });

    const markers = response.data.values?.map((row, index) => {
      const speedValue = parseFloat(row[6]?.match(/\d+\.?\d*/)?.[0] || 0);
      
      let quality;
      if (speedValue < 0.3) {
        quality = 'poor';
      } else if (speedValue < 3) {
        quality = 'moderate';
      } else {
        quality = 'good';
      }

      return {
        id: index + 1,
        date: row[0],
        name: row[1],
        email: row[2],
        address: row[3],
        provider: row[4],
        issue: row[5],
        internetSpeed: row[6],
        description: row[7],
        screenshotUrl: row[8],
        quality,
        lat: 0,
        lng: 0
      };
    }) || [];

    res.status(200).json(markers);
  } catch (err) {
    console.error('Data fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/story/submit-story', async (req, res) => {
  const { title, content, region, name } = req.body;
  
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Stories!A2:E',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [
          [name || 'Anonymous', region, title, content, new Date().toLocaleDateString()]
        ],
      },
    });

    res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error('Error saving story:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/story/get-stories', async (req, res) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Stories!A2:E',
    });

    const stories = response.data.values.map((row, index) => ({
      id: index + 1,
      name: row[0],
      region: row[1],
      title: row[2],
      content: row[3],
      date: row[4],
      upvotes: 0
    }));

    res.status(200).json(stories);
  } catch (err) {
    console.error('Error fetching stories:', err);
    res.status(500).json({ error: err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));