import { useState } from 'react'
import { DashboardShell } from '../layout/DashboardShell'
import { DashboardHeader } from '../layout/DashboardHeader'
import { LeftRail } from '../layout/LeftRail'
import { CenterStage } from '../layout/CenterStage'
import { RightPanel } from '../layout/RightPanel'

export function DashboardPage() {
  const [isDarkMode, setIsDarkMode] = useState(true)

  // Mock data - in real app, this would come from API
  const headerData = {
    productName: 'Knowledge Core',
    currentStage: 'Cloud Crust',
    todaySummary: 'You created 4 notes today, 2 tasks completed',
  }

  const leftRailData = {
    stageData: {
      name: 'Cloud Crust',
      progress: 68,
      level: 3,
      nextUnlock: '20 linked notes to unlock data rings',
    },
    metrics: {
      totalNotes: 156,
      weeklyNew: 12,
      tasksCompleted: 8,
      storageUsed: 45,
    },
    heatmapData: Array(7).fill(0).map(() => Array(7).fill(0).map(() => Math.floor(Math.random() * 10))),
    trendData: [10, 12, 15, 18, 22, 25, 28],
    recentItems: ['Daily Notes', 'Project Ideas', 'Reading List', 'Code Snippets'],
  }

  const centerStageData = {
    coreData: {
      stage: 3,
      notesCount: 156,
      linksCount: 89,
      stability: 0.7,
      evolutionRate: 0.8,
    },
  }

  const rightPanelData = {
    tasks: [
      {
        id: '1',
        title: '整理今日笔记',
        description: '将零散想法归档到知识库',
        priority: 'high' as const,
        energy: 30,
        completed: false,
      },
      {
        id: '2',
        title: '补充周计划记录',
        description: '更新项目进度和下一步计划',
        priority: 'medium' as const,
        energy: 15,
        completed: true,
      },
    ],
    activities: [
      {
        id: '1',
        type: 'note',
        description: '创建了新笔记 "React 最佳实践"',
        timestamp: '2 分钟前',
        energy: 5,
      },
      {
        id: '2',
        type: 'task',
        description: '完成了任务 "代码重构"',
        timestamp: '15 分钟前',
        energy: 20,
      },
      {
        id: '3',
        type: 'link',
        description: '建立了笔记关联',
        timestamp: '1 小时前',
        energy: 3,
      },
    ],
    dailyStats: {
      focusTime: '3h 20m',
      newNotes: 4,
      completedTasks: 2,
      knowledgeLinks: 12,
      suggestion: '建议整理项目文档，建立更好的知识关联',
    },
  }

  const handleLogSubmit = (content: string) => {
    console.log('Log submitted:', content)
    // In real app, send to API
  }

  const handleTaskToggle = (taskId: string) => {
    console.log('Task toggled:', taskId)
    // In real app, update task status
  }

  return (
    <DashboardShell
      header={
        <DashboardHeader
          {...headerData}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        />
      }
      leftRail={<LeftRail {...leftRailData} />}
      centerStage={<CenterStage {...centerStageData} />}
      rightPanel={
        <RightPanel
          onLogSubmit={handleLogSubmit}
          tasks={rightPanelData.tasks}
          onTaskToggle={handleTaskToggle}
          activities={rightPanelData.activities}
          dailyStats={rightPanelData.dailyStats}
        />
      }
    />
  )
}