const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// TODO: Replace with multer or busboy for real uploads
app.post('/upload', (req, res) => {
  // Placeholder: Accepts multipart in future
  res.status(501).json({ error: 'Not implemented - implement multipart upload with multer' });
});

app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
