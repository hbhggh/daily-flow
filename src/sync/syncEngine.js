import { supabase } from './supabase'

const SYNC_PREFIX = 'dfp:'
const SKIP_KEYS = ['dfp:api-key'] // 不同步敏感数据

let _skipSync = false   // 防止云端写入 → localStorage → 再推云端的循环
let _channel = null
let _userId = null
let _pendingPushes = new Map()
let _pushTimer = null
let _onSyncEvent = null // 回调：通知 UI 同步状态
let _reloadStores = null

function shouldSync(key) {
  return key.startsWith(SYNC_PREFIX) && !SKIP_KEYS.some((sk) => key === sk)
}

// 代理 localStorage.setItem，拦截所有 dfp: 写入
function installProxy() {
  const originalSetItem = localStorage.setItem.bind(localStorage)
  const originalRemoveItem = localStorage.removeItem.bind(localStorage)

  localStorage.setItem = (key, value) => {
    originalSetItem(key, value)
    if (!_skipSync && _userId && shouldSync(key)) {
      schedulePush(key, value)
    }
  }

  localStorage.removeItem = (key) => {
    originalRemoveItem(key)
    if (!_skipSync && _userId && shouldSync(key)) {
      schedulePush(key, null)
    }
  }
}

function schedulePush(key, value) {
  _pendingPushes.set(key, value)
  clearTimeout(_pushTimer)
  _pushTimer = setTimeout(flushPushes, 500) // 500ms 防抖
}

async function flushPushes() {
  if (_pendingPushes.size === 0 || !_userId) return

  const batch = [..._pendingPushes.entries()]
  _pendingPushes.clear()

  try {
    // Upsert 非 null 值
    const upserts = batch
      .filter(([, v]) => v !== null)
      .map(([key, value]) => ({
        user_id: _userId,
        key,
        value,
        updated_at: new Date().toISOString(),
      }))

    if (upserts.length > 0) {
      const { error } = await supabase
        .from('user_data')
        .upsert(upserts, { onConflict: 'user_id,key' })
      if (error) console.warn('[sync] push error:', error.message)
    }

    // 删除 null 值
    const deletes = batch.filter(([, v]) => v === null).map(([key]) => key)
    if (deletes.length > 0) {
      await supabase
        .from('user_data')
        .delete()
        .eq('user_id', _userId)
        .in('key', deletes)
    }

    _onSyncEvent?.('pushed')
  } catch (e) {
    console.warn('[sync] push failed:', e.message)
  }
}

// 从云端拉取所有数据 → 写入 localStorage
async function pullAll() {
  if (!_userId) return false

  const { data, error } = await supabase
    .from('user_data')
    .select('key, value')
    .eq('user_id', _userId)

  if (error) {
    console.warn('[sync] pull error:', error.message)
    return false
  }

  if (!data || data.length === 0) {
    // 云端无数据 → 首次登录，推送本地数据到云端
    await pushAllLocal()
    return true
  }

  // 云端有数据 → 写入 localStorage
  _skipSync = true
  for (const row of data) {
    if (row.value !== null) {
      localStorage.setItem(row.key, row.value)
    }
  }
  _skipSync = false

  _onSyncEvent?.('pulled')
  return true
}

// 推送所有本地 dfp: 数据到云端
async function pushAllLocal() {
  if (!_userId) return

  const rows = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (shouldSync(key)) {
      rows.push({
        user_id: _userId,
        key,
        value: localStorage.getItem(key),
        updated_at: new Date().toISOString(),
      })
    }
  }

  if (rows.length > 0) {
    // 分批 upsert（Supabase 单次最多 ~1000 行）
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500)
      const { error } = await supabase
        .from('user_data')
        .upsert(batch, { onConflict: 'user_id,key' })
      if (error) console.warn('[sync] pushAll error:', error.message)
    }
  }

  _onSyncEvent?.('pushed')
}

// 订阅实时变更
function subscribeRealtime() {
  if (_channel) {
    supabase.removeChannel(_channel)
  }

  _channel = supabase
    .channel('user-data-sync')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_data',
        filter: `user_id=eq.${_userId}`,
      },
      (payload) => {
        _skipSync = true

        if (payload.eventType === 'DELETE') {
          const key = payload.old?.key
          if (key) localStorage.removeItem(key)
        } else {
          const { key, value } = payload.new
          if (key && value !== null) {
            localStorage.setItem(key, value)
          }
        }

        _skipSync = false

        // 触发 store 重新读取
        _reloadStores?.()
        _onSyncEvent?.('realtime')
      }
    )
    .subscribe()
}

// 初始化同步引擎
export function initSync({ onSyncEvent, reloadStores }) {
  _onSyncEvent = onSyncEvent
  _reloadStores = reloadStores
  installProxy()
}

// 用户登录后调用
export async function startSync(userId) {
  _userId = userId
  const success = await pullAll()
  if (success) {
    _reloadStores?.()
    subscribeRealtime()
  }
  return success
}

// 用户登出时调用
export function stopSync() {
  _userId = null
  if (_channel) {
    supabase.removeChannel(_channel)
    _channel = null
  }
  clearTimeout(_pushTimer)
  _pendingPushes.clear()
}

// 手动触发全量同步
export async function forceSync() {
  if (!_userId) return
  await pushAllLocal()
  await pullAll()
  _reloadStores?.()
  _onSyncEvent?.('force')
}

export function isSyncing() {
  return !!_userId
}
