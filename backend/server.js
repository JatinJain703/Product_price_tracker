require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./prismaClient');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
    console.log(`  Tracked: GET /cronitems`);
    console.log(`  History: GET /history/:productId`);
});
