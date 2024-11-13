const puppeteer = require('puppeteer');
const express = require('express');
const path = require('path');
const fs = require('fs/promises');

// Constants
const PORT = process.env.PORT || 8000;
const THUMBNAILS_DIR = path.join(__dirname, 'thumbnails');
const MODELS_DIR = path.join(__dirname, 'models');
const TIME_LIMIT = 1000 * 60 * 5; //5 minutes
// Initialize Express app
const app = express();
app.use(express.json());

// Ensure thumbnails directory exists
async function ensureThumbnailsDir() {
  try {
    await fs.access(THUMBNAILS_DIR);
  } catch {
    await fs.mkdir(THUMBNAILS_DIR, { recursive: true });
  }
}

// Route handlers
app.get('/', (req, res) => {
  res.send('Hello');
});

app.get('/getFile', (req, res) => {
  const fileName = req.query.name;
  
  // Validate filename
  if (!fileName || fileName.includes('..')) {
    return res.status(400).send('Invalid filename');
  }
  
  res.sendFile(fileName, { root: MODELS_DIR });
});

app.get('/web-worker', async (req, res) => {
  const { url, name: localFileName } = req.query;
  
  try {
    const html = await fs.readFile(path.join(__dirname, 'index.html'), 'utf8');
    const processedHtml = html.replace(
      '{url}',
      url || `http://localhost:${PORT}/getFile?name=${localFileName}`
    );
    res.send(processedHtml);
  } catch (error) {
    console.error('Error reading index.html:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/create_thumbnail', async (req, res) => {
  const start = performance.now();
  const { url, name: fileName } = req.query;

  let browser;
  try {
    // Ensure thumbnails directory exists
    await ensureThumbnailsDir();

    // Launch browser with optimized settings
    browser = await puppeteer.launch({
      headless: 'new', // Using new headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        // '--disable-gpu',
        '--disable-extensions'
      ],
      ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {})
    });

    const page = await browser.newPage();
    
    // Optimize page performance
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font') {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Navigate to page
    const pageUrl = `http://localhost:${PORT}/web-worker?name=${fileName}&url=${url || ''}`;
    await page.goto(pageUrl, {
      waitUntil: ['load', 'networkidle0'],
      timeout: TIME_LIMIT
    });

    // Wait for model to load
    await page.waitForFunction(
      'document.querySelector("#model").hasAttribute("loaded")',
      { timeout: TIME_LIMIT }
    );

    // Take screenshot with optimized settings
    await page.screenshot({
      path: path.join(THUMBNAILS_DIR, `${fileName}.jpeg`),
      type: 'jpeg',
      quality: 80,
      optimizeForSpeed: true
    });

    console.log(`Saved ${fileName} to thumbnails folder`);
    res.send('ok');

  } catch (error) {
    console.error('Error creating thumbnail:', error);
    res.status(500).send('Error creating thumbnail');
  } finally {
    if (browser) {
      await browser.close();
    }
    const end = performance.now();
    console.log(`Time taken to execute create thumbnail function: ${(end - start).toFixed(2)}ms`);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Performing cleanup...');
  process.exit(0);
});