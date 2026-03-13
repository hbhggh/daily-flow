import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Service Worker 强制更新机制
// 解决 iOS PWA 无法手动刷新、永远跑旧代码的问题
if ('serviceWorker' in navigator) {
  // 当新 SW 接管控制权时，立即重载页面以使用新代码
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })

  // 主动检查更新：页面加载后立即检查 + 每 60 秒检查一次
  navigator.serviceWorker.ready.then((registration) => {
    // 立即检查一次
    registration.update()

    // 每 60 秒检查新版本
    setInterval(() => registration.update(), 60 * 1000)

    // 切回 App 时也检查（iOS 从后台恢复时触发）
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update()
      }
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
