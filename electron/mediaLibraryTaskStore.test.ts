import { afterEach, describe, expect, it } from 'vitest'

import { MediaLibraryTaskStore } from './mediaLibraryTaskStore'
import { cleanupTempMediaRoot, createTempMediaRoot } from './test-utils/mediaLibraryFixtures'
import { openMigratedSqliteDatabase } from './test-utils/sqliteHarness'

describe('MediaLibraryTaskStore', () => {
  const roots: string[] = []
  const closers: Array<() => void> = []

  afterEach(async () => {
    for (const close of closers) {
      close()
    }
    closers.length = 0

    for (const root of roots) {
      await cleanupTempMediaRoot(root)
    }
    roots.length = 0
  })

  it('upsertTask 会归一化进度与计数，并可回读更新值', async () => {
    const root = await createTempMediaRoot('mpx-task-store-')
    roots.push(root)

    const harness = openMigratedSqliteDatabase(root)
    closers.push(harness.close)
    const store = new MediaLibraryTaskStore(harness.db)

    store.upsertTask({
      taskId: 'task-1',
      taskType: 'import',
      taskSource: 'dialog-files',
      sourcePaths: ['D:/a.jpg'],
      status: 'running',
      progress: 1.8,
      processedCount: -2,
      totalCount: -8,
      message: 'running',
      errorDetail: null,
      createdAtMs: 100,
      updatedAtMs: 120,
    })

    let task = store.readTask('task-1')
    expect(task).toMatchObject({
      progress: 1,
      processedCount: 0,
      totalCount: 0,
      message: 'running',
      errorDetail: null,
    })

    store.upsertTask({
      taskId: 'task-1',
      taskType: 'import',
      taskSource: 'dialog-files',
      sourcePaths: ['D:/a.jpg', 'D:/b.jpg'],
      status: 'failed',
      progress: -0.4,
      processedCount: 1,
      totalCount: 3,
      message: null,
      errorDetail: 'failed',
      createdAtMs: 100,
      updatedAtMs: 200,
    })

    task = store.readTask('task-1')
    expect(task).toMatchObject({
      status: 'failed',
      progress: 0,
      processedCount: 1,
      totalCount: 3,
      message: null,
      errorDetail: 'failed',
      sourcePaths: ['D:/a.jpg', 'D:/b.jpg'],
    })
  })

  it('readTasks 按 created_at_ms 倒序返回，非法 source_paths_json 回退为空数组', async () => {
    const root = await createTempMediaRoot('mpx-task-order-')
    roots.push(root)

    const harness = openMigratedSqliteDatabase(root)
    closers.push(harness.close)
    const store = new MediaLibraryTaskStore(harness.db)

    store.upsertTask({
      taskId: 'task-old',
      taskType: 'import',
      taskSource: 'dialog-files',
      sourcePaths: ['D:/old.jpg'],
      status: 'completed',
      progress: 1,
      processedCount: 1,
      totalCount: 1,
      message: 'ok',
      errorDetail: null,
      createdAtMs: 100,
      updatedAtMs: 100,
    })

    store.upsertTask({
      taskId: 'task-new',
      taskType: 'import',
      taskSource: 'drag-drop',
      sourcePaths: ['D:/new.jpg'],
      status: 'running',
      progress: 0.5,
      processedCount: 1,
      totalCount: 2,
      message: null,
      errorDetail: null,
      createdAtMs: 200,
      updatedAtMs: 210,
    })

    harness.db.prepare('UPDATE task_log SET source_paths_json = ? WHERE task_id = ?').run('{broken', 'task-new')

    const tasks = store.readTasks()
    expect(tasks.map((task) => task.taskId)).toEqual(['task-new', 'task-old'])
    expect(tasks[0]?.sourcePaths).toEqual([])
    expect(tasks[1]?.sourcePaths).toEqual(['D:/old.jpg'])
  })
})
