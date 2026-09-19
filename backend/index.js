const prisma = require('./prismaClient');

const BASE = 'https://demo.inelabteamdev.com';

async function fetchAllProducts() {
    const products = [];
    let page = 1;
    const pageSize = 100;

    while (true) {
        const res = await fetch(`${BASE}/api/catalog?page=${page}&pageSize=${pageSize}`);
        const data = await res.json();

        const items = data.items || data.products || data;
        if (!items || items.length === 0) break;

        products.push(...items);

        if (page >= data.pages) break;
        page++;
    }

    return products;
}

async function fetchAndSaveAllItems() {
    const products = await fetchAllProducts();
    console.log(`Fetched ${products.length} products`);

    const dataToInsert = products.map(p => ({
        productId: p.id,
        slug: p.slug || '',
        name: p.name || '',
        brand: p.brand || '',
        category: p.category || '',
        sku: p.sku || '',
        description: p.description || ''
    }));

    // Deduplicate by productId to avoid constraint errors
    const seen = new Set();
    const uniqueDataToInsert = dataToInsert.filter(p => {
        if (seen.has(p.productId)) return false;
        seen.add(p.productId);
        return true;
    });

    try {
        console.log('Inserting products into the database...');
        const result = await prisma.item.createMany({
            data: uniqueDataToInsert,
            skipDuplicates: true,
        });
        console.log(`Successfully inserted ${result.count} items.`);
    } catch (error) {
        console.error('Error saving items to the database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fetchAndSaveAllItems();