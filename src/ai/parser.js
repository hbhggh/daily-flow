// 安全解析 AI 返回的 JSON
export function parseAIResponse(response) {
  const text = response.content?.[0]?.text || ''

  // 尝试直接解析
  try { return JSON.parse(text) } catch {}

  // 尝试提取 ```json``` 块
  const jsonMatch = text.match(/```json?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[1]) } catch {}
  }

  // 尝试找到第一个 { 和最后一个 }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)) } catch {}
  }

  // 数组形式
  const arrStart = text.indexOf('[')
  const arrEnd = text.lastIndexOf(']')
  if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
    try { return JSON.parse(text.slice(arrStart, arrEnd + 1)) } catch {}
  }

  // 解析失败，返回原始文本
  return { raw: text, parseError: true }
}
