const axios = require('axios');
const cheerio = require('cheerio');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');

class MangaMetadataService {
    constructor(config = {}) {
        this.proxy = config.proxy || 'socks5://127.0.0.1:2080';
        
        let agent;
        if (this.proxy.startsWith('socks')) {
            agent = new SocksProxyAgent(this.proxy);
        } else {
            agent = new HttpsProxyAgent(this.proxy);
        }
        
        this.agent = agent;
        this.cookies = config.cookies || 'sl=dm_1';

        this.client = axios.create({
            httpsAgent: this.agent,
            httpAgent: this.agent,
            timeout: 25000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Cookie': this.cookies,
                'Referer': 'https://e-hentai.org/'
            }
        });
    }

    async searchAll(input) {
        const parsed = this.parseInput(input);
        console.log(`[Service] SearchAll: ${JSON.stringify(parsed)}`);

        const nhPromise = this.processSource(parsed, 'nhentai');
        const ehPromise = this.processSource(parsed, 'ehentai');

        const [nh, eh] = await Promise.allSettled([nhPromise, ehPromise]);

        return {
            nhentai: this.formatResult(nh),
            ehentai: this.formatResult(eh)
        };
    }

    async searchOne(source, input) {
        const parsed = this.parseInput(input);
        console.log(`[Service] SearchOne [${source}]: ${JSON.stringify(parsed)}`);
        
        try {
            const result = await this.processSource(parsed, source);
            return { success: true, data: result.success ? result.data : [], message: result.message };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    formatResult(promiseResult) {
        if (promiseResult.status === 'fulfilled') {
            return promiseResult.value; 
        } else {
            return { success: false, message: `Error: ${promiseResult.reason.message}` };
        }
    }

    async processSource(parsed, source) {
        try {
            let dataList = [];

            // --- 1. NHENTAI ---
            if (source === 'nhentai') {
                if (parsed.type === 'id' || parsed.type === 'nh_link') {
                    const id = parsed.value || parsed.id;
                    const single = await this.fetchNhById(id);
                    if (single) dataList.push(single);
                } else {
                    dataList = await this.searchNhentai(parsed.value);
                }
                
                if (dataList.length > 0) {
                    return { success: true, data: dataList.map(d => this.normalize(d, 'nhentai')) };
                }
            }

            // --- 2. E-HENTAI ---
            if (source === 'ehentai') {
                if (parsed.type === 'eh_link') {
                    const single = await this.fetchEHMetadata([[parseInt(parsed.gid), parsed.token]]);
                    if (single && single.length > 0) dataList = single;
                } 
                else if (parsed.type === 'eh_page_link') {
                    const tokenData = await this.fetchTokenFromPage(parsed.gid, parsed.pageToken, parsed.pageNumber);
                    if (tokenData && tokenData.token) {
                        const single = await this.fetchEHMetadata([[parseInt(tokenData.gid), tokenData.token]]);
                        if (single && single.length > 0) dataList = single;
                    }
                }
                else if (parsed.type === 'id') {
                    dataList = await this.searchEHentai(`gid:${parsed.value}`); 
                } 
                else {
                    dataList = await this.searchEHentai(parsed.value);
                }
                
                if (dataList.length > 0) {
                    return { success: true, data: dataList.map(d => this.normalize(d, 'ehentai')) };
                }
            }

            return { success: false, message: "Not found" };

        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    parseInput(input) {
        if (/^\d+$/.test(input)) return { type: 'id', value: input };
        
        const ehMatch = input.match(/e-hentai\.org\/g\/(\d+)\/([a-f0-9]+)/);
        if (ehMatch) return { type: 'eh_link', gid: ehMatch[1], token: ehMatch[2] };

        const ehPageMatch = input.match(/e-hentai\.org\/s\/([a-f0-9]+)\/(\d+)-(\d+)/);
        if (ehPageMatch) return { type: 'eh_page_link', pageToken: ehPageMatch[1], gid: ehPageMatch[2], pageNumber: ehPageMatch[3] };

        const nhMatch = input.match(/nhentai\.net\/g\/(\d+)/);
        if (nhMatch) return { type: 'nh_link', id: nhMatch[1] };
        
        let query = input.replace(/\.(zip|rar|cbz|cbr|7z)$/i, '').trim();
        return { type: 'keyword', value: query };
    }

    // --- Nhentai ---
    async fetchNhById(id) {
        const res = await this.client.get(`https://nhentai.net/api/gallery/${id}`);
        return res.data;
    }
    async searchNhentai(keyword) {
        const url = `https://nhentai.net/api/galleries/search?query=${encodeURIComponent(keyword)}&page=1`;
        const res = await this.client.get(url);
        if (res.data.result && res.data.result.length > 0) {
            return res.data.result;
        }
        return [];
    }

    // --- E-Hentai ---
    async searchEHentai(keyword) {
        const url = `https://e-hentai.org/?f_search=${encodeURIComponent(keyword)}`;
        console.log(`[EH] GET ${url}`);
        const res = await this.client.get(url);
        const $ = cheerio.load(res.data);
        
        const gidlist = [];
        const seen = new Set();
        const candidates = $('.gl1t a, .gl3c a, .gl2c a'); 
        
        candidates.each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
                const match = href.match(/\/g\/(\d+)\/([a-f0-9]+)/);
                if (match) {
                    const gid = parseInt(match[1]);
                    const token = match[2];
                    if (!seen.has(gid)) {
                        seen.add(gid);
                        gidlist.push([gid, token]);
                    }
                }
            }
        });

        if (gidlist.length > 0) {
            return await this.fetchEHMetadata(gidlist);
        }
        return [];
    }

    async fetchEHMetadata(gidlist) {
        const res = await this.client.post('https://api.e-hentai.org/api.php', {
            "method": "gdata",
            "gidlist": gidlist,
            "namespace": 1
        });
        if (res.data.gmetadata) {
            return res.data.gmetadata.filter(m => !m.error);
        }
        return [];
    }

    async fetchTokenFromPage(gid, pageToken, pageNumber) {
        const res = await this.client.post('https://api.e-hentai.org/api.php', {
            "method": "gtoken",
            "pagelist": [[pageToken, parseInt(gid), parseInt(pageNumber)]]
        });
        const result = res.data.tokenlist?.[0];
        if (result?.error) throw new Error(result.error);
        return { gid: result.gid, token: result.gtoken };
    }

    normalize(data, source) {
        const raw = data.raw || data;
        const result = { source, id: null, title: null, cover: null, url: null, token: null, tags: [], raw: raw };
        
        if (source === 'nhentai') {
            result.id = raw.id;
            result.title = raw.title.pretty || raw.title.english;
            result.title_original = raw.title.japanese; // Keep JPN title
            result.url = `https://nhentai.net/g/${raw.id}/`;
            const coverExt = raw.images?.cover?.t === 'p' ? 'png' : 'jpg';
            result.cover = `https://t.nhentai.net/galleries/${raw.media_id}/cover.${coverExt}`;
            result.tags = raw.tags ? raw.tags.map(t => t.name) : [];
            
            // Stats
            result.posted = raw.upload_date; // Keep Unix TS
            result.favorited = raw.num_favorites;
            result.pages = raw.num_pages;
        } 
        else if (source === 'ehentai') {
            result.id = raw.gid;
            result.token = raw.token; 
            result.title = raw.title;
            result.title_original = raw.title_jpn; // Keep JPN title
            result.url = `https://e-hentai.org/g/${raw.gid}/${raw.token}/`;
            result.cover = raw.thumb;
            result.tags = raw.tags; 
            result.pages = raw.filecount;
            
            // Rich Metadata
            result.category = raw.category;
            result.uploader = raw.uploader;
            result.rating = raw.rating;
            result.posted = raw.posted; // Keep Unix TS
            result.filesize = raw.filesize ? (parseInt(raw.filesize) / 1024 / 1024).toFixed(2) + ' MB' : '?';
        } 
        return result;
    }
}

module.exports = MangaMetadataService;
