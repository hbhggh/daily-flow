import { useRef } from 'react'
import { STORE_PREFIX } from '../stores/storage'

export default function DataManager({ open, onClose }) {
  const fileRef = useRef(null)

  if (!open) return null

  const handleExport = () => {
    const data = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key.startsWith(STORE_PREFIX)) {
        data[key] = localStorage.getItem(key)
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dailyflow-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        let count = 0
        for (const [key, value] of Object.entries(data)) {
          if (key.startsWith(STORE_PREFIX)) {
            localStorage.setItem(key, value)
            count++
          }
        }
        alert(`成功导入 ${count} 条数据，页面将刷新。`)
        window.location.reload()
      } catch {
        alert('导入失败：文件格式无效')
      }
    }
    reader.readAsText(file)
  }

  const handleClearAll = () => {
    if (!confirm('确定要清除所有数据吗？此操作不可撤销！')) return
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key.startsWith(STORE_PREFIX)) keysToRemove.push(key)
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k))
    window.location.reload()
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-content" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
          数据管理
        </div>

        <button
          onClick={handleExport}
          style={{
            width: '100%', padding: '14px', borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-blue)15', border: '1px solid var(--accent-blue)30',
            color: 'var(--accent-blue)', fontSize: 13, fontWeight: 700, marginBottom: 10,
          }}
        >
          📦 导出数据 (JSON)
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          style={{
            width: '100%', padding: '14px', borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-green)15', border: '1px solid var(--accent-green)30',
            color: 'var(--accent-green)', fontSize: 13, fontWeight: 700, marginBottom: 10,
          }}
        >
          📥 导入数据
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          style={{ display: 'none' }}
        />

        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
          iOS Safari 可能在存储空间不足时清除 localStorage。
          建议定期导出备份。
        </div>

        <button
          onClick={handleClearAll}
          style={{
            width: '100%', padding: '14px', borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-pink)10', border: '1px solid var(--accent-pink)20',
            color: 'var(--accent-pink)', fontSize: 13, fontWeight: 600,
          }}
        >
          🗑 清除所有数据
        </button>
      </div>
    </div>
  )
}
