const API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-sonnet-4-20250514'

const TOKEN_BUDGETS = {
  project_decompose: 2048,
  morning_plan: 1024,
  day_observe: 512,
  evening_review: 1536,
}

export async function callClaude(messages, purpose, options = {}) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('请先设置 API Key')

  const maxTokens = TOKEN_BUDGETS[purpose] || 1024

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODEL,
      max_tokens: maxTokens,
      messages,
      system: options.system,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `API Error ${response.status}`)
  }

  const result = await response.json()

  // 记录 token 消耗
  trackUsage(result.usage)

  return result
}

// API Key 管理
export const getApiKey = () => localStorage.getItem('dfp:api-key')
export const setApiKey = (key) => localStorage.setItem('dfp:api-key', key)
export const hasApiKey = () => !!getApiKey()

// Token 使用统计
function trackUsage(usage) {
  if (!usage) return
  const today = new Date().toISOString().slice(0, 10)
  const key = `dfp:ai-usage:${today}`
  const existing = JSON.parse(localStorage.getItem(key) || '{"input":0,"output":0,"calls":0}')
  existing.input += usage.input_tokens || 0
  existing.output += usage.output_tokens || 0
  existing.calls += 1
  localStorage.setItem(key, JSON.stringify(existing))
}

export function getTodayUsage() {
  const today = new Date().toISOString().slice(0, 10)
  const key = `dfp:ai-usage:${today}`
  return JSON.parse(localStorage.getItem(key) || '{"input":0,"output":0,"calls":0}')
}
