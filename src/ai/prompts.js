const SYSTEM = `你是 Daily Flow Pipeline 的 AI 助手。帮助用户管理日常任务、拆解项目、规划每日工作。
回复始终使用简体中文。要求 JSON 格式时，只返回 JSON，不加其他文字。`

// 项目拆解
export function projectDecomposePrompt(project) {
  return {
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: `请将以下项目拆解为里程碑：

项目：${project.title}
描述：${project.description || '无'}

返回 JSON 格式：
{"milestones": [{"title": "里程碑名称"}]}

要求：
- 拆解为 4-8 个有意义的里程碑
- 按时间顺序排列
- 每个里程碑应该是可衡量的阶段性成果`,
    }],
  }
}

// 早间规划
export function morningPlanPrompt(projects, yesterdayTasks, todayExisting) {
  const projectInfo = projects.map((p) => {
    const done = p.milestones.filter((m) => m.done).length
    const total = p.milestones.length
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    return `- ${p.title} (${pct}%, ${done}/${total} 里程碑)`
  }).join('\n')

  const yesterdayDone = yesterdayTasks
    .filter((t) => t.status === 'done')
    .map((t) => `- ✅ ${t.title}`)
    .join('\n') || '无'

  const yesterdayUndone = yesterdayTasks
    .filter((t) => t.status === 'todo')
    .map((t) => `- ⬜ ${t.title}`)
    .join('\n') || '无'

  const todayInfo = todayExisting
    .map((t) => `- ${t.title}`)
    .join('\n') || '无'

  return {
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: `帮我规划今天的任务：

## 活跃项目
${projectInfo || '无'}

## 昨日完成
${yesterdayDone}

## 昨日未完成
${yesterdayUndone}

## 今日已有任务
${todayInfo}

返回 JSON 格式：
{
  "greeting": "早安问候（一句话）",
  "suggestions": [
    {"title": "任务名", "estimatedMin": 30, "energy": "high|low|physical", "points": 10, "reason": "简短原因"}
  ],
  "tip": "今日小建议（一句话）"
}

要求：建议 4-6 个任务，按优先级排序，注意精力分配（上午高精力，下午低精力）。`,
    }],
  }
}

// 日间观察
export function dayObservePrompt(tasks, pointsNet, focusMinutes) {
  const done = tasks.filter((t) => t.status === 'done').length
  const total = tasks.length

  return {
    system: SYSTEM + '\n回复限 80 字以内。',
    messages: [{
      role: 'user',
      content: `当前进度：${done}/${total} 任务完成
积分净值：${pointsNet >= 0 ? '+' : ''}${pointsNet}
今日专注：${focusMinutes} 分钟
给一句简短的鼓励或建议，不要用 JSON 格式。`,
    }],
  }
}

// 晚间复盘
export function eveningReviewPrompt(tasks, pointsEarned, pointsSpent, focusRecords) {
  const taskSummary = tasks.map((t) => {
    const icon = t.status === 'done' ? '✅' : t.status === 'skipped' ? '⏭' : '⬜'
    return `${icon} ${t.title} (预估${t.estimatedMin}min, 实际${t.actualMin}min, ${t.points}分)`
  }).join('\n')

  const focusSummary = focusRecords.map((r) =>
    `- ${Math.floor(r.durationMs / 60000)}分钟专注`
  ).join('\n') || '无专注记录'

  return {
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: `请对今天做复盘：

## 任务
${taskSummary || '无任务'}

## 积分
赚取：${pointsEarned}  支出：${pointsSpent}  净值：${pointsEarned - pointsSpent}

## 专注
${focusSummary}

返回 JSON：
{
  "summary": "今日总结（2-3句话）",
  "score": 85,
  "highlights": ["亮点1", "亮点2"],
  "improvements": ["改进建议1"],
  "encouragement": "鼓励语（一句话）"
}`,
    }],
  }
}
