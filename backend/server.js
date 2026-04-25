const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const INDEX_NAME = 'products';
const ES_URL = 'http://127.0.0.1:9200';

// Global middleware to prevent caching for all API responses
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Helper for ES fetch
async function esSearch(queryBody) {
    const res = await fetch(`${ES_URL}/${INDEX_NAME}/_search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryBody)
    });
    if (!res.ok) {
        const errText = await res.text();
        console.error('ES Error body:', errText);
        throw new Error(`ES Error: ${res.status} - ${res.statusText}. Body: ${errText}`);
    }
    return await res.json();
}

app.get('/api/search/suggest', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.json([]);
        }

        const data = await esSearch({
            query: {
                multi_match: {
                    query: q,
                    type: "bool_prefix",
                    fields: [
                        "product_name",
                        "product_name._2gram",
                        "product_name._3gram"
                    ]
                }
            },
            _source: ['product_name', 'brand'],
            size: 7
        });

        const hits = data.hits.hits.map(h => ({
            id: h._id,
            name: h._source.product_name, // Map back to name for frontend without changing frontend code
            brand: h._source.brand
        }));
        
        res.json(hits);
    } catch (error) {
        console.error('Suggest error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.json({ timeTook: 0, total: 0, hits: [] });
        }

        const data = await esSearch({
            query: {
                multi_match: {
                    query: q,
                    fields: ['product_name^3', 'description', 'brand', 'category'],
                    fuzziness: 'AUTO'
                }
            },
            highlight: {
                pre_tags: ['<mark>'],
                post_tags: ['</mark>'],
                fields: {
                    product_name: {},
                    description: {}
                }
            },
            size: 20
        });

        const hits = data.hits.hits.map(h => ({
            id: h._id,
            score: h._score,
            ...h._source,
            name: h._source.product_name, // Map to name
            highlights: h.highlight ? {
                name: h.highlight.product_name,
                description: h.highlight.description
            } : {}
        }));

        res.json({
            timeTook: data.took,
            total: data.hits.total.value,
            results: hits
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});
