const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');
const hitomi = require('node-hitomi');

// 1. 配置代理
const PROXY = 'socks5://127.0.0.1:2080';
const agent = new SocksProxyAgent(PROXY);

const client = axios.create({
    httpsAgent: agent,
    httpAgent: agent,
    timeout: 10000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://hitomi.la/',
        'Origin': 'https://hitomi.la'
    }
});

async function testConnection() {
    console.log('--- Test 1: Base Connectivity ---');
    try {
        const res = await client.get('https://hitomi.la/');
        console.log(`[Success] Hitomi Homepage: ${res.status}`);
    } catch (e) {
        console.error(`[Fail] Cannot reach Hitomi: ${e.message}`);
        return false;
    }
    return true;
}

async function testGalleryID(id) {
    console.log(`\n--- Test 2: Fetch Gallery ID ${id} ---`);
    const url = `https://ltn.hitomi.la/galleries/${id}.js`;
    console.log(`GET ${url}`);
    
    try {
        const res = await client.get(url);
        console.log(`[Success] Found Gallery JS! Length: ${res.data.length} bytes`);
        const snippet = res.data.substring(0, 100);
        console.log(`Content Snippet: ${snippet}...`);
        
        // Parse it
        const jsonText = res.data.replace(/^var\s+galleryinfo\s*=\s*/, '');
        try {
            const data = JSON.parse(jsonText);
            console.log(`[Parsed] Title: ${data.title}`);
            console.log(`[Parsed] Files: ${data.files.length}`);
        } catch (e) {
            console.error(`[Fail] JSON Parse Error: ${e.message}`);
        }
    } catch (e) {
        console.error(`[Fail] ID Fetch Error: ${e.message}`);
        if (e.response) {
            console.error(`Status: ${e.response.status}`);
            if (e.response.status === 403) console.error("Reason: 403 Forbidden (Likely CF Block or Bad User-Agent/Referer)");
            if (e.response.status === 404) console.error("Reason: 404 Not Found (ID does not exist on Hitomi)");
        }
    }
}

async function testNativeSearchLibrary(keyword) {
    console.log(`\n--- Test 3: node-hitomi Library Search ("${keyword}") ---`);
    
    // node-hitomi 不支持直接传 agent，我们尝试通过污染全局 http/https 模块或环境变量
    // 但最简单的是先看它是否能跑通（如果系统层代理已配置）
    // 由于我们是在 Node 环境且只有 SOCKS5，node-hitomi 可能会失败。
    // 我们尝试手动调用 hitomi 的 suggestion API 作为替代验证。
    
    const suggestUrl = `https://ltn.hitomi.la/suggest.php?q=${encodeURIComponent(keyword)}`;
    console.log(`[Manual] Trying Suggest API: ${suggestUrl}`);
    
    try {
        const res = await client.get(suggestUrl);
        console.log(`[Success] Suggest API Response: ${JSON.stringify(res.data)}`);
    } catch (e) {
        console.error(`[Fail] Suggest API: ${e.message}`);
    }
}

(async () => {
    const canConnect = await testConnection();
    if (canConnect) {
        await testGalleryID('3784092');
        await testNativeSearchLibrary("boku no seishun");
    }
})();
