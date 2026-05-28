import { ref } from 'vue'
import { graphApi } from '@/api/graph'
import type { GraphLoadOptions, GraphPayload, GraphTask } from '@/types/graph'

export function useGraphJob() {
  const task = ref<GraphTask | null>(null)
  const graph = ref<GraphPayload | null>(null)
  const polling = ref(false)
  const error = ref('')

  async function build(repoId: number, refVal?: string, depth = 1) {
    error.value = ''
    graph.value = null
    try {
      task.value = await graphApi.createJob({ repoId, ref: refVal || undefined, depth })
      polling.value = true
      while (polling.value) {
        await sleep(1500)
        try {
          task.value = await graphApi.getJob(task.value!.id)
        } catch (e: any) {
          error.value = e?.message || '状态查询失败'
          polling.value = false
          return
        }
        if (task.value.status === 'READY' || task.value.status === 'FAILED') {
          polling.value = false
        }
      }
    } catch (e: any) {
      error.value = e?.message || '创建任务失败'
      polling.value = false
    }
  }

  async function refresh(taskId: number) {
    try {
      task.value = await graphApi.getJob(taskId)
    } catch (e: any) {
      error.value = e?.message || '刷新失败'
    }
  }

  async function load(taskId: number, options?: GraphLoadOptions) {
    error.value = ''
    try {
      graph.value = await graphApi.getGraph(taskId, options)
    } catch (e: any) {
      error.value = e?.message || '加载图数据失败'
    }
  }

  function stop() {
    polling.value = false
  }

  return { task, graph, polling, error, build, refresh, load, stop }
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}
