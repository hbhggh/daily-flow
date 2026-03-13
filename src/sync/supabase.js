import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://owznwjkcovsifrbrtcon.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_aLxRkHXwGq7nLbk-Pcf9tg_T5VoUJW7'

// 自定义 fetch：禁用缓存 + URL 时间戳（iOS Safari 会缓存 GET 请求导致轮询拿到旧数据）
const noCacheFetch = (url, options = {}) => {
  // 给每个请求加唯一时间戳，彻底防止 iOS Safari / CDN 缓存
  const separator = url.includes('?') ? '&' : '?'
  const bustUrl = `${url}${separator}_t=${Date.now()}`
  return fetch(bustUrl, {
    ...options,
    cache: 'no-store',
  })
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { fetch: noCacheFetch },
})
