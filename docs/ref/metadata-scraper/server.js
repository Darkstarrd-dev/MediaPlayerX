const express = require('express');
const bodyParser = require('body-parser');
const MangaMetadataService = require('./metadata_service');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

// Helper to init service
const getService = (req) => {
    return new MangaMetadataService({
        proxy: req.body.proxy || 'socks5://127.0.0.1:2080',
        cookies: req.body.cookies || 'sl=dm_1'
    });
};

// Parallel Search (All Sources)
app.post('/api/search', async (req, res) => {
    const { input } = req.body;
    if (!input) return res.status(400).json({ error: 'Input is required' });

    try {
        console.log(`[API] Searching All: "${input}"`);
        const service = getService(req);
        const results = await service.searchAll(input);
        res.json({ success: true, results: results });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Single Source Search
app.post('/api/search/single', async (req, res) => {
    const { input, source } = req.body;
    if (!input || !source) return res.status(400).json({ error: 'Input and Source are required' });

    try {
        console.log(`[API] Searching Single [${source}]: "${input}"`);
        const service = getService(req);
        // Note: searchOne returns { success: bool, data: ..., message: ... }
        const result = await service.searchOne(source, input);
        res.json(result); 
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Metadata Server running at http://localhost:${PORT}`);
});
