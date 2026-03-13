import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase'

const SYNC_PREFIX = 'dfp:'
const SKIP_KEYS = ['dfp:api-key'] // 不同步敏感数据
const POLL_INTERVAL = 8000 // 8 秒轮询一次（Realtime 的后备方案）

let _skipSync = false   // 防止云端写入 → localStorage → 再推云端的循环
let _channel = null
let _userId = null
let _pendingPushes = new Map()
let _pushTimer = null
let _pollTimer = null
let _onSyncEvent = null // 回调：通知 UI 同步状态
let _reloadStores = null
let _lifecycleInstalled = false
let _accessToken = null  // 缓存用户 JWT，供 keepalive fetch 使用
let _lastPullHash = ''   // 上次拉取数据的 hash，避免无变化时重复 reload

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

// 安装页面生命周期监听器
function installLifecycleListeners() {
  if (_lifecycleInstalled) return
  _lifecycleInstalled = true

  // visibilitychange: 切 tab / 切 app
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // 页面隐藏 → 立即推送待发数据
      if (_pendingPushes.size > 0) flushPushesSync()
    } else if (document.visibilityState === 'visible' && _userId) {
      // 页面恢复 → 立即拉取最新数据（另一台设备可能已修改）
      pullAndReload()
    }
  })

  // pagehide: 页面卸载前最后机会（iOS Safari 更可靠）
  window.addEventListener('pagehide', () => {
    if (_pendingPushes.size > 0) flushPushesSync()
  })

  // beforeunload: 桌面浏览器刷新/关闭
  window.addEventListener('beforeunload', () => {
    if (_pendingPushes.size > 0) flushPushesSync()
  })
}

function schedulePush(key, value) {
  _pendingPushes.set(key, value)
  clearTimeout(_pushTimer)
  _pushTimer = setTimeout(flushPushes, 200) // 200ms 防抖
}

// 异步推送（正常流程）
async function flushPushes() {
  if (_pendingPushes.size === 0 || !_userId) return

  const batch = [..._pendingPushes.entries()]
  _pendingPushes.clear()

  try {
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

// 同步推送（页面关闭时使用 fetch + keepalive）
function flushPushesSync() {
  if (_pendingPushes.size === 0 || !_userId) return

  const batch = [..._pendingPushes.entries()]
  _pendingPushes.clear()
  clearTimeout(_pushTimer)

  const upserts = batch
    .filter(([, v]) => v !== null)
    .map(([key, value]) => ({
      user_id: _userId,
      key,
      value,
      updated_at: new Date().toISOString(),
    }))

  if (upserts.length === 0) return

  try {
    const url = `${SUPABASE_URL}/rest/v1/user_data?on_conflict=user_id,key`
    const token = _accessToken || SUPABASE_ANON_KEY
    const headers = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Prefer': 'resolution=merge-duplicates',
    }

    fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(upserts),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // 静默失败
  }
}

// 简单 hash 用于检测数据是否变化
function hashData(data) {
  if (!data || data.length === 0) return ''
  return data.map(r => r.key + ':' + (r.updated_at || '')).sort().join('|')
}

// 从云端拉取 → 写入 localStorage → 如果有变化则 reload stores
async function pullAndReload() {
  if (!_userId) return

  // 先推送待发数据
  if (_pendingPushes.size > 0) {
    await flushPushes()
  }

  const { data, error } = await supabase
    .from('user_data')
    .select('key, value, updated_at')
    .eq('user_id', _userId)

  if (error) {
    console.warn('[sync] poll pull error:', error.message)
    return
  }

  if (!data) return

  // 检查数据是否有变化
  const newHash = hashData(data)
  if (newHash === _lastPullHash) return // 无变化，跳过
  _lastPullHash = newHash

  // 写入 localStorage
  _skipSync = true
  for (const row of data) {
    if (row.value !== null) {
      localStorage.setItem(row.key, row.value)
    }
  }
  _skipSync = false

  // 通知 stores 重新读取
  _reloadStores?.()
  _onSyncEvent?.('pulled')
}

// 从云端拉取所有数据 → 写入 localStorage（启动时用）
async function pullAll() {
  if (!_userId) return false

  if (_pendingPushes.size > 0) {
    await flushPushes()
  }

  const { data, error } = await supabase
    .from('user_data')
    .select('key, value, updated_at')
    .eq('user_id', _userId)

  if (error) {
    console.warn('[sync] pull error:', error.message)
    return false
  }

  if (!data || data.length === 0) {
    await pushAllLocal()
    return true
  }

  _lastPullHash = hashData(data)

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

// 订阅实时变更（主要同步手段）
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
        _reloadStores?.()
        _onSyncEvent?.('realtime')
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[sync] realtime connected')
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('[sync] realtime failed:', status, '— using polling fallback')
      }
    })
}

// 启动轮询（Realtime 的后备方案）
// iOS Safari 的 WebSocket 可能不稳定，轮询保证数据最终一致
function startPolling() {
  stopPolling()
  _pollTimer = setInterval(() => {
    if (_userId && document.visibilityState === 'visible') {
      pullAndReload()
    }
  }, POLL_INTERVAL)
}

function stopPolling() {
  if (_pollTimer) {
    clearInterval(_pollTimer)
    _pollTimer = null
  }
}

// 初始化同步引擎
export function initSync({ onSyncEvent, reloadStores }) {
  _onSyncEvent = onSyncEvent
  _reloadStores = reloadStores
  installProxy()
  installLifecycleListeners()
}

// 用户登录后调用
export async function startSync(userId) {
  _userId = userId

  try {
    const { data: { session } } = await supabase.auth.getSession()
    _accessToken = session?.access_token || null
  } catch {
    _accessToken = null
  }

  // 先推后拉
  await pushAllLocal()
  const success = await pullAll()
  if (success) {
    _reloadStores?.()
    subscribeRealtime()
    startPolling()
  }
  return success
}

// 用户登出时调用
export function stopSync() {
  _userId = null
  _accessToken = null
  stopPolling()
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
