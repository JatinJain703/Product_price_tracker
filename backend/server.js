require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./prismaClient');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Helper: run scrape.mjs for a single productId and return parsed result
function runScraper(productId) {
    return new Promise((resolve) => {
        const scriptPath = path.join(__dirname, 'scrape.mjs');
        const child = spawn('node', [scriptPath, String(productId)], {
            env: { ...process.env },
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });

        child.on('close', () => {
            const resultLine = stdout.split('\n').find(l => l.startsWith('SCRAPE_RESULT:'));
            if (resultLine) {
                try {
                    const parsed = JSON.parse(resultLine.replace('SCRAPE_RESULT:', ''));
                    resolve(parsed[0] || { productId, error: 'Empty result' });
                } catch {
                    resolve({ productId, error: 'Failed to parse scrape output' });
                }
            } else {
                resolve({ productId, error: stderr || 'No result from scraper' });
            }
        });
    });
}

// GET /items/search?name=<query>
// Returns all items whose name contains the search query (case-insensitive)
app.get('/items/search', async (req, res) => {
    const { name } = req.query;

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Please provide a "name" query parameter.' });
    }

    try {
        const items = await prisma.item.findMany({
            where: {
                name: {
                    contains: name,
                    mode: 'insensitive',
                },
            },
            orderBy: { name: 'asc' },
        });

        return res.status(200).json({ query: name, count: items.length, results: items });
    } catch (error) {
        console.error('Search error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

// GET /items/track/:productId
// Fetches a product from Item table and stores it in CronItems table
app.get('/items/track/:productId', async (req, res) => {
    const productId = parseInt(req.params.productId);

    if (isNaN(productId)) {
        return res.status(400).json({ error: 'productId must be a valid number.' });
    }

    try {
        const item = await prisma.item.findFirst({ where: { productId } });

        if (!item) {
            return res.status(404).json({ error: `No product found with productId ${productId} in Item table.` });
        }

        const cronItem = await prisma.cronItems.upsert({
            where: { id: item.id },
            update: {},
            create: {
                productId: item.productId,
                slug: item.slug,
                name: item.name,
                brand: item.brand,
                category: item.category,
                sku: item.sku,
                description: item.description,
            },
        });

        return res.status(200).json({
            message: `Product with productId ${productId} saved to CronItems.`,
            item: cronItem,
        });
    } catch (error) {
        console.error('Track error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

// GET /scrape/run
// Gets all productIds from CronItems, scrapes each one, saves results to History
app.get('/scrape/run', async (req, res) => {
    try {
        const cronItems = await prisma.cronItems.findMany({
            select: { productId: true, name: true },
        });

        if (cronItems.length === 0) {
            return res.status(200).json({ message: 'No products in CronItems to scrape.', results: [] });
        }

        console.log(`Starting scrape for ${cronItems.length} products...`);
        const historyRecords = [];

        for (const cronItem of cronItems) {
            console.log(`Scraping productId: ${cronItem.productId}`);
            const result = await runScraper(cronItem.productId);

            const hasError = !!result.error;

            const record = await prisma.history.create({
                data: {
                    productId: cronItem.productId,
                    name: cronItem.name,
                    price: hasError ? null : (result.price ?? null),
                    stock: hasError ? null : (result.rawStock ?? null),
                    hasError: hasError,
                    errorText: hasError ? String(result.error) : null,
                },
            });

            historyRecords.push(record);
            console.log(`  → Saved history id=${record.id} price=${result.price} stock=${result.rawStock}`);
        }

        return res.status(200).json({
            message: `Scraped ${cronItems.length} products and saved to History.`,
            count: historyRecords.length,
            results: historyRecords,
        });
    } catch (error) {
        console.error('Scrape run error:', error);
    }
});
// GET /cronitems
// Fetches all products currently being tracked in CronItems
app.get('/cronitems', async (req, res) => {
    try {
        const items = await prisma.cronItems.findMany({
            orderBy: { name: 'asc' },
        });
        return res.status(200).json({ count: items.length, results: items });
    } catch (error) {
        console.error('Fetch CronItems error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

// GET /history/:productId
// Fetches all tracking history for a specific product
app.get('/history/:productId', async (req, res) => {
    const productId = parseInt(req.params.productId);

    if (isNaN(productId)) {
        return res.status(400).json({ error: 'productId must be a valid number.' });
    }

    try {
        const history = await prisma.history.findMany({
            where: { productId },
            orderBy: { scrapedAt: 'desc' },
        });

        return res.status(200).json({
            productId,
            count: history.length,
            results: history,
        });
    } catch (error) {
        console.error('Fetch History error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`  Search:  GET /items/search?name=<query>`);
    console.log(`  Track:   GET /items/track/:productId`);
    console.log(`  Scrape:  GET /scrape/run`);
    console.log(`  Tracked: GET /cronitems`);
    console.log(`  History: GET /history/:productId`);
});
