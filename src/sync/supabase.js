import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://owznwjkcovsifrbrtcon.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_aLxRkHXwGq7nLbk-Pcf9tg_T5VoUJW7'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
