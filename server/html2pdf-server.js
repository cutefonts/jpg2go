const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cors());

app.post('/api/html-to-pdf', async (req, res) => {
  const { url, pageSize = 'A4', orientation = 'portrait' } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  let browser;
  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    const pdfBuffer = await page.pdf({
      format: pageSize,
      landscape: orientation === 'landscape',
      printBackground: true,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(url.replace(/[^a-z0-9]/gi, '_'))}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`HTML-to-PDF server running on port ${PORT}`)); 