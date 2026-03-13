import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase'

const SYNC_PREFIX = 'dfp:'
const SKIP_KEYS = ['dfp:api-key'] // 不同步敏感数据

let _skipSync = false   // 防止云端写入 → localStorage → 再推云端的循环
let _channel = null
let _userId = null
let _pendingPushes = new Map()
let _pushTimer = null
let _onSyncEvent = null // 回调：通知 UI 同步状态
let _reloadStores = null
let _lifecycleInstalled = false
let _accessToken = null  // 缓存用户 JWT，供 keepalive fetch 使用

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

// 安装页面生命周期监听器（确保页面关闭前推送数据）
function installLifecycleListeners() {
  if (_lifecycleInstalled) return
  _lifecycleInstalled = true

  // visibilitychange: 用户切换 tab 或切换 app 时触发
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && _pendingPushes.size > 0) {
      flushPushesSync()
    }
  })

  // pagehide: 页面真正卸载前的最后机会（iOS Safari 更可靠）
  window.addEventListener('pagehide', () => {
    if (_pendingPushes.size > 0) {
      flushPushesSync()
    }
  })

  // beforeunload: 桌面浏览器刷新/关闭
  window.addEventListener('beforeunload', () => {
    if (_pendingPushes.size > 0) {
      flushPushesSync()
    }
  })
}

function schedulePush(key, value) {
  _pendingPushes.set(key, value)
  clearTimeout(_pushTimer)
  _pushTimer = setTimeout(flushPushes, 200) // 200ms 防抖（从 500ms 降低）
}

// 异步推送（正常流程）
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

// 同步推送（页面关闭时使用 fetch + keepalive）
// 这是关键修复：iOS Safari 在 pagehide/visibilitychange 中
// 无法可靠执行异步操作，但 fetch(keepalive:true) 能保证请求发出
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

  // 直接使用 Supabase REST API + fetch keepalive
  // keepalive: true 让浏览器在页面卸载后仍然完成请求
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
    }).catch(() => {
      // 静默失败 — 页面已经在卸载了
    })
  } catch {
    // 静默失败
  }
}

// 从云端拉取所有数据 → 写入 localStorage
async function pullAll() {
  if (!_userId) return false

  // 关键修复：拉取前先把本地待推送的数据推上去
  // 防止云端旧数据覆盖本地新修改
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
  installLifecycleListeners()
}

// 用户登录后调用
export async function startSync(userId) {
  _userId = userId

  // 缓存 access_token（供 keepalive fetch 在页面关闭时使用）
  try {
    const { data: { session } } = await supabase.auth.getSession()
    _accessToken = session?.access_token || null
  } catch {
    _accessToken = null
  }

  // 先把本地所有数据推到云端，确保不丢失
  await pushAllLocal()

  // 再拉取云端数据（此时云端已包含本地数据）
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
  _accessToken = null
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
