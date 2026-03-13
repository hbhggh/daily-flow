import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://owznwjkcovsifrbrtcon.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_aLxRkHXwGq7nLbk-Pcf9tg_T5VoUJW7'

// 自定义 fetch：禁用缓存（iOS Safari 会缓存 GET 请求导致轮询拿到旧数据）
const noCacheFetch = (url, options = {}) => {
  return fetch(url, {
    ...options,
    cache: 'no-store',
  })
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { fetch: noCacheFetch },
})
