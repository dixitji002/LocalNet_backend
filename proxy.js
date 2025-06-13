// proxy.js (your backend server)
const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());

app.post('/api/proxy_prompts', async (req, res) => {
  try {
    const response = await fetch('https://extensions.aitopia.ai/ai/prompts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // pass along auth headers if needed
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch external API' });
  }
});

app.listen(5000, () => console.log('Proxy running on port 5000'));
