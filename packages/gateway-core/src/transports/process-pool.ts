/**
 * Process Pool
 *
 * Manages a pool of reusable subprocesses for stdio MCP servers.
 * Reduces startup latency by keeping warm processes available.
 */

import type { Subprocess } from "bun"

export interface PoolConfig {
  maxProcesses: number
  idleTimeout: number
  warmupCount: number
}

interface PooledProcess {
  process: Subprocess
  inUse: boolean
  lastUsed: number
  createdAt: number
}

export class ProcessPool {
  private pool = new Map<string, PooledProcess[]>()
  private config: PoolConfig
  private cleanupTimers = new Map<string, Timer>()
  private pendingCreations = new Map<string, number>()
  private generation = new Map<string, number>()

  constructor(config: Partial<PoolConfig> = {}) {
    this.config = {
      maxProcesses: config.maxProcesses ?? 10,
      idleTimeout: config.idleTimeout ?? 30000,
      warmupCount: config.warmupCount ?? 2,
    }
  }

  async acquire(
    key: string,
    factory: () => Promise<Subprocess>
  ): Promise<Subprocess> {
    const pooled = this.pool.get(key)
    const available = pooled?.filter((p) => !p.inUse && !p.process.killed)

    if (available && available.length > 0) {
      const item = available[0]
      item.inUse = true
      item.lastUsed = Date.now()
      return item.process
    }

    const liveCount = pooled?.filter((p) => !p.process.killed).length ?? 0
    const pending = this.pendingCreations.get(key) ?? 0
    if (liveCount + pending >= this.config.maxProcesses) {
      throw new Error(`Process pool limit reached for key: ${key}`)
    }

    const gen = this.generation.get(key) ?? 0
    this.pendingCreations.set(key, pending + 1)
    try {
      const proc = await factory()

      if ((this.generation.get(key) ?? 0) !== gen) {
        proc.kill("SIGTERM")
        throw new Error(`Pool was drained during process creation for key: ${key}`)
      }

      const pooledItem: PooledProcess = {
        process: proc,
        inUse: true,
        lastUsed: Date.now(),
        createdAt: Date.now(),
      }

      const existing = this.pool.get(key) || []
      this.pool.set(key, [...existing, pooledItem])

      return proc
    } finally {
      const current = this.pendingCreations.get(key) ?? 1
      this.pendingCreations.set(key, current - 1)
    }
  }

  release(key: string, process: Subprocess): void {
    const pooled = this.pool.get(key)
    const item = pooled?.find((p) => p.process === process)

    if (item) {
      item.inUse = false
      item.lastUsed = Date.now()
    }

    this.scheduleCleanup(key)
  }

  private scheduleCleanup(key: string): void {
    const existingTimer = this.cleanupTimers.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const timer = setTimeout(() => {
      this.cleanup(key)
      this.cleanupTimers.delete(key)
    }, this.config.idleTimeout)

    this.cleanupTimers.set(key, timer)
  }

  private cleanup(key: string): void {
    const now = Date.now()
    const pooled = this.pool.get(key)
    if (!pooled) return

    const keep: PooledProcess[] = []
    const remove: PooledProcess[] = []

    for (const p of pooled) {
      const isIdle = !p.inUse && now - p.lastUsed > this.config.idleTimeout
      const isDead = p.process.killed

      if (isIdle || isDead) {
        remove.push(p)
      } else {
        keep.push(p)
      }
    }

    for (const p of remove) {
      if (!p.process.killed) {
        p.process.kill("SIGTERM")
      }
    }

    if (keep.length > 0) {
      this.pool.set(key, keep)
    } else {
      this.pool.delete(key)
    }
  }

  async warmup(key: string, factory: () => Promise<Subprocess>): Promise<void> {
    const pooled = this.pool.get(key)
    const liveCount = pooled?.filter((p) => !p.process.killed).length ?? 0
    const pending = this.pendingCreations.get(key) ?? 0
    const toCreate = Math.min(
      this.config.warmupCount - liveCount,
      this.config.maxProcesses - liveCount - pending
    )

    if (toCreate <= 0) return

    const gen = this.generation.get(key) ?? 0
    this.pendingCreations.set(key, pending + toCreate)

    const promises: Promise<void>[] = []

    for (let i = 0; i < toCreate; i++) {
      promises.push(
        factory()
          .then((proc) => {
            if ((this.generation.get(key) ?? 0) !== gen) {
              proc.kill("SIGTERM")
              return
            }

            const pooledItem: PooledProcess = {
              process: proc,
              inUse: false,
              lastUsed: Date.now(),
              createdAt: Date.now(),
            }

            const items = this.pool.get(key) || []
            this.pool.set(key, [...items, pooledItem])
          })
          .finally(() => {
            const current = this.pendingCreations.get(key) ?? 1
            this.pendingCreations.set(key, current - 1)
          })
      )
    }

    await Promise.all(promises)
  }

  getStats(): {
    key: string
    total: number
    inUse: number
    idle: number
  }[] {
    return Array.from(this.pool.entries()).map(([key, processes]) => ({
      key,
      total: processes.length,
      inUse: processes.filter((p) => p.inUse).length,
      idle: processes.filter((p) => !p.inUse && !p.process.killed).length,
    }))
  }

  getPoolSize(key: string): number {
    return this.pool.get(key)?.length ?? 0
  }

  getAvailableCount(key: string): number {
    const pooled = this.pool.get(key)
    return pooled?.filter((p) => !p.inUse && !p.process.killed).length ?? 0
  }

  async drainKey(key: string): Promise<void> {
    const currentGen = this.generation.get(key) ?? 0
    this.generation.set(key, currentGen + 1)

    const pooled = this.pool.get(key)
    if (!pooled) return

    for (const p of pooled) {
      if (!p.process.killed) {
        p.process.kill("SIGTERM")
      }
    }

    const timer = this.cleanupTimers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.cleanupTimers.delete(key)
    }

    this.pool.delete(key)
  }

  async drainAll(): Promise<void> {
    for (const [key, processes] of this.pool) {
      const currentGen = this.generation.get(key) ?? 0
      this.generation.set(key, currentGen + 1)

      for (const p of processes) {
        if (!p.process.killed) {
          p.process.kill("SIGTERM")
        }
      }
    }

    for (const timer of this.cleanupTimers.values()) {
      clearTimeout(timer)
    }

    this.pool.clear()
    this.cleanupTimers.clear()
  }

  getConfig(): PoolConfig {
    return { ...this.config }
  }
}
