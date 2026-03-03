export const AD_REVIEW_SYSTEM_PROMPT =
  "You moderate manga/comic pages. Identify whether an image is an advertisement or promotion page. " +
  "Treat as ad if it contains QR codes, URLs, store/product promotions, coupons/discounts, game downloads, gambling, recruitment, " +
  "or Chinese marketing text such as '关注公众号', '扫码', '推广', '促销', '下载游戏', '官方微博', '官方QQ群', '加群领取', '长按扫码'. " +
  "Also treat pure-color or near-pure-color pages (for example solid white/black separator or blank pages) as ad. " +
  'Ignore normal story pages. Respond JSON only: {"is_ad": true/false, "reason": string}.';

export const AD_REVIEW_USER_PROMPT =
  "Is this image an advertisement/promotion page or a pure-color blank page? Return JSON only.";

export const AD_REVIEW_HEAD_BATCH_SYSTEM_PROMPT =
  "你是漫画头部页面审核助手。重点识别同图聚类、覆盖广告页和覆盖广告文本。必须基于 image_id 返回结构化 JSON，不要输出解释性文本。";

export const AD_REVIEW_TAIL_BATCH_SYSTEM_PROMPT =
  "你是漫画尾部页面审核助手。重点识别广告页、空白页、非正文页。必须基于 image_id 返回结构化 JSON，不要输出解释性文本。";

export const AD_REVIEW_BATCH_USER_PROMPT = [
  "请仅输出 JSON，结构如下：",
  "{",
  '  "protocol": "head_tail_review_v1",',
  '  "input_image_ids": ["01"],',
  '  "duplicate_groups": [{"ids": ["01", "02"], "ad_overlay_ids": ["01"], "ad_overlay_texts": [{"image_id": "01", "texts": ["KOKOKORO个人汉化"]}]}],',
  '  "ad_image_ids": ["01"],',
  '  "blank_image_ids": ["03"],',
  '  "body_image_ids": ["02"],',
  '  "non_body_image_ids": ["01", "03"],',
  '  "items": [{',
  '    "image_id": "01",',
  '    "is_ad": true,',
  '    "is_blank": false,',
  '    "is_body": false,',
  '    "is_non_body": true,',
  '    "is_cover_like": true,',
  '    "is_ad_overlay_cover": true,',
  '    "reason": "...",',
  '    "confidence": 0.95',
  "  }]",
  "}",
  "规则：items 必须覆盖全部 input_image_ids 且一一对应；所有 id 必须来自输入 image_id；数组顺序按输入顺序。",
].join("\n");
