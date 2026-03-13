import { useState } from 'react'
import { supabase } from '../sync/supabase'

export default function AuthSheet({ open, user, onClose, onAuthChange }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('login') // 'login' | 'signup'

  if (!open) return null

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setError(null)

    try {
      let result
      if (mode === 'signup') {
        result = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        })
      } else {
        result = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        })
      }

      if (result.error) {
        setError(result.error.message)
      } else if (result.data?.user) {
        onAuthChange?.(result.data.user)
        setEmail('')
        setPassword('')
        onClose()
      }
    } catch (e) {
      setError(e.message)
    }

    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onAuthChange?.(null)
    onClose()
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-content" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />

        {user ? (
          // 已登录状态
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
              云端同步
            </div>
            <div style={{
              padding: 16, borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-green)10', border: '1px solid var(--accent-green)25',
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 600 }}>
                已登录 · 同步开启
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                {user.email}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-pink)10', border: '1px solid var(--accent-pink)20',
                color: 'var(--accent-pink)', fontSize: 13, fontWeight: 600,
              }}
            >
              退出登录
            </button>
          </div>
        ) : (
          // 未登录状态
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              {mode === 'login' ? '登录' : '注册'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 16 }}>
              登录后数据自动跨设备同步
            </div>

            {error && (
              <div style={{
                padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-red)15', color: 'var(--accent-red)',
                fontSize: 11, marginBottom: 12,
              }}>
                {error}
              </div>
            )}

            <input
              type="email"
              placeholder="邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 13, marginBottom: 8,
              }}
            />
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 13, marginBottom: 16,
              }}
            />

            <button
              onClick={handleSubmit}
              disabled={loading || !email.trim() || !password.trim()}
              style={{
                width: '100%', height: 44, borderRadius: 'var(--radius-sm)',
                background: loading ? 'var(--bg-elevated)' : 'var(--accent-blue)',
                color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 12,
              }}
            >
              {loading ? '请稍候...' : mode === 'login' ? '登录' : '注册'}
            </button>

            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
              style={{
                width: '100%', padding: '8px', background: 'none',
                color: 'var(--text-secondary)', fontSize: 12,
              }}
            >
              {mode === 'login' ? '没有账号？点击注册' : '已有账号？点击登录'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
