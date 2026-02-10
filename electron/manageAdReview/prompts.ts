export const AD_REVIEW_SYSTEM_PROMPT =
  "You moderate manga/comic pages. Identify whether an image is an advertisement or promotion page. " +
  "Treat as ad if it contains QR codes, URLs, store/product promotions, coupons/discounts, game downloads, gambling, recruitment, " +
  "or Chinese marketing text such as '关注公众号', '扫码', '推广', '促销', '下载游戏', '官方微博', '官方QQ群', '加群领取', '长按扫码'. " +
  'Ignore normal story pages. Respond JSON only: {"is_ad": true/false, "reason": string}.'

export const AD_REVIEW_USER_PROMPT = 'Is this image an advertisement or promotion page? Return JSON only.'
