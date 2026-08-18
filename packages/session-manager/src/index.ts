/**
 * Session manager host service.
 *
 * Deployment-level home of the session-manager capability:
 * - restore (unarchive) sessions durably by removing their id from the
 *   workspace domain's archive set, so `host/archived-sessions-changed`
 *   frames reveal the row on every connected browser;
 * - delete sessions: workspace accounting removal + archive-set hiding
 *   (immediate) + on-disk log removal (immediate for cold sessions, queued
 *   until the session stops for live ones);
 * - a workspace-grouped inventory for the settings page.
 *
 * Exposed to the browser over @Remote methods (`ctx.remote.sessionManager.*`).
 * @module @deepseek-ai/dsh-session-manager
 */
import { basename, dirname } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type {
  SessionManagerGroup,
  SessionManagerItem,
  SessionManagerListResult,
  SessionManagerResult,
} from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    sessionManager: SessionManagerService
  }
}

// --- minimal structural faces for optional services read through ctx.get() ---
interface DomainGlobal { get(): unknown; set(value: unknown): Promise<void> }
interface DomainTable {
  get(key: string): unknown
  entries(): IterableIterator<[string, unknown]>
  update(key: string, fn: (current: any) => any): Promise<unknown>
}
interface DomainHandle { global: DomainGlobal; table(name: string): DomainTable }
interface DomainFacility { get(name: string): DomainHandle | undefined }
interface FsTarget { path: string }
interface FsService {
  resolve(path: string): Promise<FsTarget>
  readText(target: FsTarget): Promise<string>
  writeText(target: FsTarget, content: string): Promise<void>
}
interface SubprocessHandle { done: Promise<{ exitCode: number | null }>; terminate(): void }
interface SubprocessService {
  spawn(spec: { argv: readonly string[]; cwd: string; stdio: { stdin: string; stdout: string; stderr: string }; graceMs: number }): SubprocessHandle
}
interface SessionHeaderLike { id: string; createdAt: number; cwd?: string; origin?: 'subagent'; parentSession?: string }
interface SessionRecordLike { header: SessionHeaderLike; live: boolean }
interface TitleObservation { sessionId: string; status: string; value?: { title?: { title: string } | undefined } | undefined }
interface SessionQueryService {
  listSessions(): Promise<SessionRecordLike[]>
  readTitleSnapshots(ids: string[]): Promise<TitleObservation[]>
}
interface PersistenceMetaLike { cwd?: string }
interface SessionPersistenceService {
  readRaw(id: string): Promise<{ meta?: PersistenceMetaLike } | undefined>
  locate(meta: PersistenceMetaLike): { path?: string } | undefined
}
interface WorkspaceRecordLike { title: string; path: string; sessionIds: string[] }
interface WorkspaceRegistryFace {
  archivedSessionIds: readonly string[]
  archiveSession: (id: string) => Promise<void>
  create: (...args: any[]) => Promise<unknown>
  delete: (...args: any[]) => Promise<unknown>
  insertBefore: (...args: any[]) => Promise<unknown>
}
interface TimerService { interval(fn: () => void, ms: number): () => void }
interface SandboxPolicyFace { workspaceRoot: string }
interface WorkspaceDomainState {
  initialized: boolean
  workspaceIds: string[]
  archivedSessionIds: string[]
  pendingMutation?: unknown
}

const sameIds = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((id, index) => id === right[index])

/** The session-manager service: durable restore/delete + inventory. */
export class SessionManagerService extends TypertRemoteService {
  /** Hard dependencies: the service only activates after these exist. */
  static inject = ['workspaceRegistry', 'storageDomain', 'sessionQuery']

  private domain: DomainHandle | null = null
  private table: DomainTable | null = null
  private workspaceRegistry: WorkspaceRegistryFace | null = null
  private sessionQuery: SessionQueryService | null = null
  private sessionPersistence: SessionPersistenceService | null = null
  private subprocess: SubprocessService | null = null
  private fsService: FsService | null = null
  private statePath: string | null = null
  /** True once the workspace domain is open and the registry patches applied. */
  private ready = false

  /** Ids restored by this service (removed from the durable archive set). */
  private readonly unarchived = new Set<string>()
  /** Ids deleted by this service (kept in the durable set so frames hide them). */
  private readonly deleted = new Set<string>()
  /** Live sessions whose on-disk log deletion is deferred until they stop. */
  private readonly pendingDeletes = new Set<string>()
  private chain: Promise<void> = Promise.resolve()
  private sweeping = false

  constructor(ctx: Context) {
    super(ctx, 'sessionManager')
    // The workspace domain may not be open yet when a deployment-level plugin
    // mounts at startup: initialize lazily, once the domain is available.
    const tryInit = (): void => {
      if (this.ready) return
      const storageDomain = ctx.get('storageDomain') as DomainFacility | undefined
      const workspaceRegistry = ctx.get('workspaceRegistry') as WorkspaceRegistryFace | undefined
      const sessionQuery = ctx.get('sessionQuery') as SessionQueryService | undefined
      const domain = storageDomain !== undefined ? storageDomain.get('workspace') : undefined
      if (workspaceRegistry === undefined || sessionQuery === undefined || domain === undefined) return
      this.init(ctx, domain, workspaceRegistry, sessionQuery)
    }
    tryInit()
    // Robust readiness: react to the registry publishing the domain, and poll
    // as a fallback so a missed event (startup race) never leaves the service
    // permanently inert. The poll stops once ready.
    const timer = ctx.get('timer') as TimerService | undefined
    ctx.effect(() => {
      const onAnyCtx = (ctx as unknown as { on(name: string, listener: (change: unknown) => void): () => void }).on.bind(ctx)
      const onChanged = onAnyCtx('domain/changed', (change: unknown) => {
        if (change !== null && typeof change === 'object' && (change as { domain?: string }).domain === 'workspace') {
          tryInit()
        }
      })
      let stopPoll: (() => void) | undefined
      const startPoll = (): void => {
        stopPoll = timer === undefined ? undefined : timer.interval(() => {
          if (this.ready) { if (stopPoll !== undefined) stopPoll(); return }
          tryInit()
        }, 300)
      }
      startPoll()
      return () => {
        onChanged()
        if (stopPoll !== undefined) stopPoll()
      }
    }, 'session-manager: readiness')
  }

  private init(
    ctx: Context,
    domain: DomainHandle,
    workspaceRegistry: WorkspaceRegistryFace,
    sessionQuery: SessionQueryService,
  ): void {
    this.domain = domain
    this.table = domain.table('workspaces')
    this.workspaceRegistry = workspaceRegistry
    this.sessionQuery = sessionQuery
    const sessionPersistence = ctx.get('sessionPersistence') as SessionPersistenceService | undefined
    const subprocess = ctx.get('subprocess') as SubprocessService | undefined
    const fsService = ctx.get('fs') as FsService | undefined
    const sandboxPolicy = ctx.get('sandboxPolicy') as SandboxPolicyFace | undefined
    const timer = ctx.get('timer') as TimerService | undefined
    this.sessionPersistence = sessionPersistence ?? null
    this.subprocess = subprocess ?? null
    this.fsService = fsService ?? null
    const workspaceRoot = sandboxPolicy !== undefined && typeof sandboxPolicy.workspaceRoot === 'string'
      ? sandboxPolicy.workspaceRoot
      : undefined
    this.statePath = fsService !== undefined && workspaceRoot !== undefined
      ? `${workspaceRoot.replace(/\/+$/, '')}/.session-manager-state.json`
      : null

    // Keep the public archive-set getter consistent with the authoritative
    // domain (the registry's private cache can disagree after our writes).
    const protoDescriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(workspaceRegistry), 'archivedSessionIds')
    Object.defineProperty(workspaceRegistry, 'archivedSessionIds', {
      configurable: true,
      get: () => this.readState().archivedSessionIds.filter(id => !this.unarchived.has(id)),
    })

    const originalMethods = new Map<string, unknown>()
    for (const name of ['archiveSession', 'create', 'delete', 'insertBefore']) {
      const method = (workspaceRegistry as unknown as Record<string, unknown>)[name]
      originalMethods.set(name, method)
    }

    // Fully own archiveSession against the authoritative domain so re-archiving
    // a restored id works even when the registry cache disagrees.
    (workspaceRegistry as unknown as Record<string, unknown>).archiveSession = async (sessionId: string) => {
      return await this.enqueue(async () => {
        const state = this.readState()
        if (state.archivedSessionIds.includes(sessionId)) {
          this.unarchived.delete(sessionId)
          return
        }
        if (!(await this.knownSession(sessionId))) {
          throw new Error(`cannot archive session '${sessionId}': no such session`)
        }
        this.unarchived.delete(sessionId)
        await this.writeState({ ...state, archivedSessionIds: [...state.archivedSessionIds, sessionId] })
      })
    }
    // Registry writes that rewrite the whole global can resurrect its stale
    // cache's archive set; re-apply our authoritative set afterwards.
    for (const name of ['create', 'delete', 'insertBefore']) {
      const original = (workspaceRegistry as unknown as Record<string, unknown>)[name] as (...args: any[]) => Promise<unknown>
      ;(workspaceRegistry as unknown as Record<string, unknown>)[name] = async (...args: any[]) => {
        const result = await original.apply(workspaceRegistry, args)
        await this.reconcile()
        return result
      }
    }

    ctx.effect(() => {
      // Once a deleted-but-still-live session leaves the store, erase its log.
      const onAny = (ctx as unknown as { on(name: string, listener: (session: { id: string }) => void): () => void }).on.bind(ctx)
      onAny('session/disposed', (session: { id: string }) => {
        const id = session && typeof session.id === 'string' ? session.id : null
        if (id === null || !this.pendingDeletes.has(id)) return
        this.pendingDeletes.delete(id)
        void this.deleteArtifact(id)
        void this.persistState()
      })
      // Periodic sweep so queued log deletions never wait forever.
      const stopSweep = timer === undefined ? undefined : timer.interval(() => { void this.sweepPending() }, 60000)
      // Restore persisted deletion state, then re-check queued deletions.
      void this.restoreState().then(() => { void this.sweepPending() })
      return () => {
        if (stopSweep !== undefined) stopSweep()
        for (const name of ['archiveSession', 'create', 'delete', 'insertBefore']) {
          const original = originalMethods.get(name)
          if (original === undefined) (workspaceRegistry as unknown as Record<string, unknown>)[name] = undefined
          else (workspaceRegistry as unknown as Record<string, unknown>)[name] = original
        }
        if (protoDescriptor === undefined) {
          delete (workspaceRegistry as unknown as Record<string, unknown>).archivedSessionIds
        } else {
          Object.defineProperty(workspaceRegistry, 'archivedSessionIds', protoDescriptor)
        }
      }
    }, 'session-manager: registry patches')

    this.ready = true
  }

  // --- inventory ---

  /** Workspace-grouped inventory of every session not deleted through this service. */
  @Remote('list')
  async list(): Promise<SessionManagerListResult> {
    await this.sweepPending()
    if (!this.ready) return { items: [], groups: [], archivedCount: 0 }
    const state = this.readState()
    const archivedVisible = new Set(this.domainDesired(state).filter(id => !this.deleted.has(id)))
    const records = await (this.sessionQuery as SessionQueryService).listSessions()
    const observations = records.length > 0
      ? await (this.sessionQuery as SessionQueryService).readTitleSnapshots(records.map(record => record.header.id))
      : []
    const titleBy = new Map<string, string>()
    for (const observation of observations) {
      if (observation.status === 'fulfilled' && observation.value?.title !== undefined) {
        titleBy.set(observation.sessionId, observation.value.title.title)
      }
    }
    const items: SessionManagerItem[] = []
    for (const record of records) {
      const header = record.header
      const id = String(header.id)
      if (this.deleted.has(id)) continue
      items.push({
        id,
        title: titleBy.get(id) ?? '',
        createdAt: header.createdAt,
        cwd: header.cwd ?? '',
        archived: archivedVisible.has(id),
        deleted: this.deleted.has(id),
        live: record.live,
        origin: header.origin === 'subagent' ? 'subagent' : 'main',
        parentSession: header.parentSession === undefined ? '' : String(header.parentSession),
      })
    }
    items.sort((a, b) => b.createdAt - a.createdAt)
    const archivedCount = items.reduce((count, item) => item.archived ? count + 1 : count, 0)
    return { items, groups: this.buildGroups(items), archivedCount }
  }

  // --- single-session verbs ---

  /** Restore one archived session (removes it from the durable archive set). */
  @Remote('restore')
  async restore(sessionId: string): Promise<SessionManagerResult> {
    try {
      return await this.enqueue(async () => {
        if (this.deleted.has(sessionId)) return this.fail('session has been deleted')
        const state = this.readState()
        if (!state.archivedSessionIds.includes(sessionId)) {
          return this.ok(true, '', false, 'this session was already restored')
        }
        if (!(await this.knownSession(sessionId))) {
          return this.fail('session log no longer exists, cannot restore')
        }
        this.unarchived.add(sessionId)
        const next = state.archivedSessionIds.filter(id => id !== sessionId)
        await this.writeState({ ...state, archivedSessionIds: next })
        void this.persistState()
        return this.ok(true, '', false, '')
      })
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : String(error))
    }
  }

  /** Restore every currently archived (non-deleted) session. */
  @Remote('restoreMany')
  async restoreMany(ids?: string[]): Promise<SessionManagerResult> {
    try {
      return await this.enqueue(async () => {
        const state = this.readState()
        const targets = ids === undefined
          ? state.archivedSessionIds.filter(id => !this.deleted.has(id))
          : ids
        const records = await (this.sessionQuery as SessionQueryService).listSessions()
        const knownIds = new Set(records.map(record => String(record.header.id)))
        let restored = 0
        const failures: Array<{ id: string; error: string }> = []
        const removable = new Set<string>()
        for (const id of targets) {
          if (this.deleted.has(id)) { failures.push({ id, error: 'session has been deleted' }); continue }
          if (!state.archivedSessionIds.includes(id)) continue
          if (!knownIds.has(id)) {
            failures.push({ id, error: 'session log no longer exists, cannot restore' })
            continue
          }
          removable.add(id)
          this.unarchived.add(id)
          restored += 1
        }
        if (removable.size > 0) {
          const next = state.archivedSessionIds.filter(id => !removable.has(id))
          await this.writeState({ ...state, archivedSessionIds: next })
        }
        void this.persistState()
        return this.ok(true, '', false, '', 0, restored, failures)
      })
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : String(error))
    }
  }

  /** Archive one session into the registry archive set. */
  @Remote('archive')
  async archive(sessionId: string): Promise<SessionManagerResult> {
    try {
      this.requireReady()
      await (this.workspaceRegistry as WorkspaceRegistryFace).archiveSession(sessionId)
      return this.ok(true, '', false, '')
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : String(error))
    }
  }

  /** Delete one session: un-account, hide, and remove its on-disk log. */
  @Remote('deleteSession')
  async deleteSession(sessionId: string): Promise<SessionManagerResult> {
    try {
      return await this.enqueue(async () => {
        const outcome = await this.deleteOne(sessionId)
        if (!outcome.ok) return this.fail(outcome.error)
        return this.ok(true, '', outcome.removedLog, outcome.note)
      })
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : String(error))
    }
  }

  /** Delete the given sessions in one batch. */
  @Remote('deleteSessions')
  async deleteSessions(ids: string[]): Promise<SessionManagerResult> {
    if (ids.length === 0) return this.fail('no session ids provided')
    try {
      return await this.enqueue(async () => {
        const records = await (this.sessionQuery as SessionQueryService).listSessions()
        const byId = new Map(records.map(record => [String(record.header.id), record]))
        let removed = 0
        const failures: Array<{ id: string; error: string }> = []
        for (const id of ids) {
          const outcome = await this.deleteOne(id, byId.get(id))
          if (outcome.ok) removed += 1
          else failures.push({ id, error: outcome.error })
        }
        return this.ok(true, '', false, '', removed, 0, failures)
      })
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : String(error))
    }
  }

  /** Delete every currently archived (non-deleted) session. */
  @Remote('deleteAllArchived')
  async deleteAllArchived(): Promise<SessionManagerResult> {
    try {
      return await this.enqueue(async () => {
        const state = this.readState()
        const archivedIds = state.archivedSessionIds.filter(id => !this.deleted.has(id))
        if (archivedIds.length === 0) return this.ok(true, '', false, '', 0, 0, [])
        const records = await (this.sessionQuery as SessionQueryService).listSessions()
        const byId = new Map(records.map(record => [String(record.header.id), record]))
        let removed = 0
        const failures: Array<{ id: string; error: string }> = []
        for (const id of archivedIds) {
          const outcome = await this.deleteOne(id, byId.get(id))
          if (outcome.ok) removed += 1
          else failures.push({ id, error: outcome.error })
        }
        return this.ok(true, '', false, '', removed, 0, failures)
      })
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : String(error))
    }
  }

  // --- internals ---

  private requireReady(): void {
    if (!this.ready || this.domain === null || this.table === null
      || this.workspaceRegistry === null || this.sessionQuery === null) {
      throw new Error('session-manager: not ready yet')
    }
  }

  private readState(): WorkspaceDomainState {
    this.requireReady()
    return (this.domain as DomainHandle).global.get() as WorkspaceDomainState
  }

  private writeState(state: WorkspaceDomainState): Promise<void> {
    return (this.domain as DomainHandle).global.set(state) as Promise<void>
  }

  private domainDesired(state: WorkspaceDomainState): string[] {
    return state.archivedSessionIds.filter(id => !this.unarchived.has(id))
  }

  private async reconcile(): Promise<void> {
    const state = this.readState()
    const next = this.domainDesired(state)
    if (sameIds(next, state.archivedSessionIds)) return
    await this.writeState({ ...state, archivedSessionIds: next })
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.chain.then(task, task)
    this.chain = run.then(() => {}, () => {})
    return run
  }

  private ok(
    ok: boolean, error: string, removedLog: boolean, note: string,
    removed = 0, restored = 0, failures: Array<{ id: string; error: string }> = [],
  ): SessionManagerResult {
    return { ok, error, removedLog, note, removed, restored, failures }
  }

  private fail(error: string): SessionManagerResult {
    return { ok: false, error, removedLog: false, note: '', removed: 0, restored: 0, failures: [] }
  }

  private async knownSession(id: string): Promise<boolean> {
    this.requireReady()
    const live = this.ctx.get('sessions') as { get(sessionId: string): unknown } | undefined
    if (live !== undefined && live.get(id) !== undefined) return true
    const records = await (this.sessionQuery as SessionQueryService).listSessions()
    return records.some(record => String(record.header.id) === String(id))
  }

  private buildGroups(items: SessionManagerItem[]): SessionManagerGroup[] {
    this.requireReady()
    const table = this.table as DomainTable
    const workspaceOrder: string[] = []
    const sessionWorkspace = new Map<string, string>()
    for (const entry of table.entries()) {
      const wsId = String(entry[0])
      workspaceOrder.push(wsId)
      const record = entry[1] as WorkspaceRecordLike
      for (const sessionId of record.sessionIds) {
        if (!sessionWorkspace.has(String(sessionId))) sessionWorkspace.set(String(sessionId), wsId)
      }
    }
    const byWorkspace = new Map<string, SessionManagerItem[]>()
    for (const item of items) {
      const wsId = sessionWorkspace.get(item.id)
      if (wsId === undefined) continue
      const list = byWorkspace.get(wsId)
      if (list === undefined) byWorkspace.set(wsId, [item])
      else list.push(item)
    }
    const groups: SessionManagerGroup[] = []
    for (const wsId of workspaceOrder) {
      const sessions = byWorkspace.get(wsId)
      if (sessions === undefined) continue
      const record = table.get(wsId) as WorkspaceRecordLike | undefined
      groups.push({
        key: `ws-${wsId}`,
        workspaceId: wsId,
        title: record === undefined ? wsId : record.title,
        path: record === undefined ? '' : record.path,
        sessions,
      })
    }
    const ungrouped = items.filter(item => !sessionWorkspace.has(item.id))
    if (ungrouped.length > 0) {
      groups.push({ key: 'ungrouped', workspaceId: '', title: 'Ungrouped', path: '', sessions: ungrouped })
    }
    return groups
  }

  private async rmDir(target: string): Promise<void> {
    if (this.subprocess === null) throw new Error('subprocess service is unavailable')
    let handle: SubprocessHandle
    try {
      handle = (this.subprocess as SubprocessService).spawn({
        argv: ['rm', '-rf', '--', target],
        cwd: '/',
        stdio: { stdin: 'ignore', stdout: 'ignore', stderr: 'ignore' },
        graceMs: 15000,
      })
    } catch (error) {
      throw new Error(`failed to start rm: ${error instanceof Error ? error.message : String(error)}`)
    }
    try {
      const outcome = await handle.done
      if (outcome.exitCode !== 0) {
        throw new Error(`artifact deletion exited with code ${String(outcome.exitCode)}`)
      }
    } catch (error) {
      try { handle.terminate() } catch { /* ignore */ }
      throw error
    }
  }

  private async deleteArtifact(sessionId: string): Promise<string | null> {
    if (this.sessionPersistence === null) {
      return 'persistence service unavailable; log file not removed'
    }
    try {
      const raw = await (this.sessionPersistence as SessionPersistenceService).readRaw(sessionId)
      if (raw === undefined || raw.meta === undefined) return 'no persisted log artifact found'
      const location = (this.sessionPersistence as SessionPersistenceService).locate(raw.meta)
      const path = location !== undefined && typeof location.path === 'string' ? location.path : null
      const fileBase = path === null ? null : basename(path)
      const target = path !== null
        && path.startsWith('/')
        && (fileBase === 'session.jsonl' || fileBase === 'session.jsonl.zstd')
        && !path.split('/').includes('..')
        && basename(dirname(path)) === String(sessionId)
        ? dirname(path)
        : null
      if (target === null) return 'artifact path validation failed; log file not removed'
      await this.rmDir(target)
      return null
    } catch (error) {
      return `log removal failed: ${error instanceof Error ? error.message : String(error)}`
    }
  }

  private async deleteOne(
    sessionId: string,
    record?: SessionRecordLike,
  ): Promise<{ ok: boolean; error: string; note: string; removedLog: boolean }> {
    if (record === undefined) {
      const records = await (this.sessionQuery as SessionQueryService).listSessions()
      record = records.find(r => String(r.header.id) === String(sessionId))
    }
    if (record === undefined) {
      // An archive-set orphan: the id is still in the durable archive set but
      // its session log no longer exists on disk. Clear it instead of failing,
      // so a bulk delete-all-archived purges these stale ids (they would
      // otherwise reappear forever and inflate the failure count).
      this.requireReady()
      const purgeState = this.readState()
      if (purgeState.archivedSessionIds.includes(sessionId)) {
        this.deleted.add(sessionId)
        this.unarchived.delete(sessionId)
        const next = purgeState.archivedSessionIds.filter(id => id !== sessionId)
        await this.writeState({ ...purgeState, archivedSessionIds: next })
        void this.persistState()
        return { ok: true, error: '', note: 'cleared archived record for a session whose log no longer exists', removedLog: false }
      }
      return { ok: false, error: 'session does not exist', note: '', removedLog: false }
    }

    this.requireReady()
    const table = this.table as DomainTable
    for (const entry of table.entries()) {
      const key = entry[0]
      const value = entry[1] as WorkspaceRecordLike
      if (!value.sessionIds.includes(sessionId)) continue
      await table.update(key, (current: WorkspaceRecordLike) => ({
        ...current,
        sessionIds: current.sessionIds.filter(id => id !== sessionId),
      }))
    }

    this.deleted.add(sessionId)
    this.unarchived.delete(sessionId)
    const state = this.readState()
    if (!state.archivedSessionIds.includes(sessionId)) {
      await this.writeState({ ...state, archivedSessionIds: [...state.archivedSessionIds, sessionId] })
    }

    if (record.live) {
      this.pendingDeletes.add(sessionId)
      void this.persistState()
      return {
        ok: true,
        error: '',
        note: 'session removed; its log is queued and will be erased automatically once the session stops',
        removedLog: false,
      }
    }
    const note = await this.deleteArtifact(sessionId)
    void this.persistState()
    return { ok: true, error: '', note: note ?? '', removedLog: note === null }
  }

  private async sweepPending(): Promise<void> {
    if (this.pendingDeletes.size === 0 || this.sweeping) return
    this.sweeping = true
    try {
      const records = await (this.sessionQuery as SessionQueryService).listSessions()
      const liveIds = new Set(records.filter(record => record.live).map(record => String(record.header.id)))
      let changed = false
      for (const id of [...this.pendingDeletes]) {
        if (liveIds.has(id)) continue
        this.pendingDeletes.delete(id)
        changed = true
        void this.deleteArtifact(id)
      }
      if (changed) void this.persistState()
    } catch (error) {
      this.ctx.logger.warn('session-manager: pending-delete sweep failed:', error)
    } finally {
      this.sweeping = false
    }
  }

  private async persistState(): Promise<void> {
    if (this.statePath === null || this.fsService === null) return
    try {
      const target = await (this.fsService as FsService).resolve(this.statePath)
      await (this.fsService as FsService).writeText(target, JSON.stringify({
        deleted: [...this.deleted],
        pending: [...this.pendingDeletes],
      }))
    } catch (error) {
      this.ctx.logger.warn('session-manager: state persist failed:', error)
    }
  }

  private async restoreState(): Promise<void> {
    if (this.statePath === null || this.fsService === null) return
    try {
      const target = await (this.fsService as FsService).resolve(this.statePath)
      const text = await this.fsService.readText(target)
      const data = JSON.parse(text) as { deleted?: unknown; pending?: unknown } | null
      if (data !== null && typeof data === 'object') {
        if (Array.isArray(data.deleted)) {
          for (const id of data.deleted) if (typeof id === 'string') this.deleted.add(id)
        }
        if (Array.isArray(data.pending)) {
          for (const id of data.pending) if (typeof id === 'string') this.pendingDeletes.add(id)
        }
      }
    } catch {
      // Absent or unreadable state file: start with empty sets.
    }
  }
}

export default SessionManagerService
