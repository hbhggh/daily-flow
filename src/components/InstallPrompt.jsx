import { useState, useEffect } from 'react'

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

export default function InstallPrompt() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // 已经是 standalone 或已dismiss 则不显示
    if (isStandalone()) return
    const dismissed = sessionStorage.getItem('dfp:install-dismissed')
    if (dismissed) return
    // 延迟显示，不打扰首次体验
    const timer = setTimeout(() => setShow(true), 5000)
    return () => clearTimeout(timer)
  }, [])

  if (!show) return null

  const dismiss = () => {
    setShow(false)
    sessionStorage.setItem('dfp:install-dismissed', '1')
  }

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 16, right: 16,
      background: 'var(--bg-card)', borderRadius: 'var(--radius)',
      border: '1px solid var(--accent-blue)30', padding: '14px 16px',
      zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      animation: 'sheetUp 0.3s ease-out',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            安装 DailyFlow
          </div>
          {isIOS() ? (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              点击底部 <span style={{ fontSize: 14 }}>⎋</span> 分享按钮，
              然后选择「添加到主屏幕」即可像 App 一样使用。
            </div>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              点击浏览器地址栏的安装图标，将 DailyFlow 添加到桌面。
            </div>
          )}
        </div>
        <button
          onClick={dismiss}
          style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            fontSize: 18, padding: '0 0 0 12px', cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}

export { isStandalone }
