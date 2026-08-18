import { basename, dirname } from "node:path";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
//#region lib/types/index.js
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
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
const sameIds = (left, right) => left.length === right.length && left.every((id, index) => id === right[index]);
/** The session-manager service: durable restore/delete + inventory. */
let SessionManagerService = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _list_decorators;
	let _restore_decorators;
	let _restoreMany_decorators;
	let _archive_decorators;
	let _deleteSession_decorators;
	let _deleteSessions_decorators;
	let _deleteAllArchived_decorators;
	return class SessionManagerService extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_list_decorators = [Remote("list")];
			_restore_decorators = [Remote("restore")];
			_restoreMany_decorators = [Remote("restoreMany")];
			_archive_decorators = [Remote("archive")];
			_deleteSession_decorators = [Remote("deleteSession")];
			_deleteSessions_decorators = [Remote("deleteSessions")];
			_deleteAllArchived_decorators = [Remote("deleteAllArchived")];
			__esDecorate(this, null, _list_decorators, {
				kind: "method",
				name: "list",
				static: false,
				private: false,
				access: {
					has: (obj) => "list" in obj,
					get: (obj) => obj.list
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _restore_decorators, {
				kind: "method",
				name: "restore",
				static: false,
				private: false,
				access: {
					has: (obj) => "restore" in obj,
					get: (obj) => obj.restore
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _restoreMany_decorators, {
				kind: "method",
				name: "restoreMany",
				static: false,
				private: false,
				access: {
					has: (obj) => "restoreMany" in obj,
					get: (obj) => obj.restoreMany
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _archive_decorators, {
				kind: "method",
				name: "archive",
				static: false,
				private: false,
				access: {
					has: (obj) => "archive" in obj,
					get: (obj) => obj.archive
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _deleteSession_decorators, {
				kind: "method",
				name: "deleteSession",
				static: false,
				private: false,
				access: {
					has: (obj) => "deleteSession" in obj,
					get: (obj) => obj.deleteSession
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _deleteSessions_decorators, {
				kind: "method",
				name: "deleteSessions",
				static: false,
				private: false,
				access: {
					has: (obj) => "deleteSessions" in obj,
					get: (obj) => obj.deleteSessions
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _deleteAllArchived_decorators, {
				kind: "method",
				name: "deleteAllArchived",
				static: false,
				private: false,
				access: {
					has: (obj) => "deleteAllArchived" in obj,
					get: (obj) => obj.deleteAllArchived
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		/** Hard dependencies: the service only activates after these exist. */
		static inject = [
			"workspaceRegistry",
			"storageDomain",
			"sessionQuery"
		];
		domain = (__runInitializers(this, _instanceExtraInitializers), null);
		table = null;
		workspaceRegistry = null;
		sessionQuery = null;
		sessionPersistence = null;
		subprocess = null;
		fsService = null;
		statePath = null;
		/** True once the workspace domain is open and the registry patches applied. */
		ready = false;
		/** Ids restored by this service (removed from the durable archive set). */
		unarchived = /* @__PURE__ */ new Set();
		/** Ids deleted by this service (kept in the durable set so frames hide them). */
		deleted = /* @__PURE__ */ new Set();
		/** Live sessions whose on-disk log deletion is deferred until they stop. */
		pendingDeletes = /* @__PURE__ */ new Set();
		chain = Promise.resolve();
		sweeping = false;
		constructor(ctx) {
			super(ctx, "sessionManager");
			const tryInit = () => {
				if (this.ready) return;
				const storageDomain = ctx.get("storageDomain");
				const workspaceRegistry = ctx.get("workspaceRegistry");
				const sessionQuery = ctx.get("sessionQuery");
				const domain = storageDomain !== void 0 ? storageDomain.get("workspace") : void 0;
				if (workspaceRegistry === void 0 || sessionQuery === void 0 || domain === void 0) return;
				this.init(ctx, domain, workspaceRegistry, sessionQuery);
			};
			tryInit();
			const timer = ctx.get("timer");
			ctx.effect(() => {
				const onChanged = ctx.on.bind(ctx)("domain/changed", (change) => {
					if (change !== null && typeof change === "object" && change.domain === "workspace") tryInit();
				});
				let stopPoll;
				const startPoll = () => {
					stopPoll = timer === void 0 ? void 0 : timer.interval(() => {
						if (this.ready) {
							if (stopPoll !== void 0) stopPoll();
							return;
						}
						tryInit();
					}, 300);
				};
				startPoll();
				return () => {
					onChanged();
					if (stopPoll !== void 0) stopPoll();
				};
			}, "session-manager: readiness");
		}
		init(ctx, domain, workspaceRegistry, sessionQuery) {
			this.domain = domain;
			this.table = domain.table("workspaces");
			this.workspaceRegistry = workspaceRegistry;
			this.sessionQuery = sessionQuery;
			const sessionPersistence = ctx.get("sessionPersistence");
			const subprocess = ctx.get("subprocess");
			const fsService = ctx.get("fs");
			const sandboxPolicy = ctx.get("sandboxPolicy");
			const timer = ctx.get("timer");
			this.sessionPersistence = sessionPersistence ?? null;
			this.subprocess = subprocess ?? null;
			this.fsService = fsService ?? null;
			const workspaceRoot = sandboxPolicy !== void 0 && typeof sandboxPolicy.workspaceRoot === "string" ? sandboxPolicy.workspaceRoot : void 0;
			this.statePath = fsService !== void 0 && workspaceRoot !== void 0 ? `${workspaceRoot.replace(/\/+$/, "")}/.session-manager-state.json` : null;
			const protoDescriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(workspaceRegistry), "archivedSessionIds");
			Object.defineProperty(workspaceRegistry, "archivedSessionIds", {
				configurable: true,
				get: () => this.readState().archivedSessionIds.filter((id) => !this.unarchived.has(id))
			});
			const originalMethods = /* @__PURE__ */ new Map();
			for (const name of [
				"archiveSession",
				"create",
				"delete",
				"insertBefore"
			]) {
				const method = workspaceRegistry[name];
				originalMethods.set(name, method);
			}
			workspaceRegistry.archiveSession = async (sessionId) => {
				return await this.enqueue(async () => {
					const state = this.readState();
					if (state.archivedSessionIds.includes(sessionId)) {
						this.unarchived.delete(sessionId);
						return;
					}
					if (!await this.knownSession(sessionId)) throw new Error(`cannot archive session '${sessionId}': no such session`);
					this.unarchived.delete(sessionId);
					await this.writeState({
						...state,
						archivedSessionIds: [...state.archivedSessionIds, sessionId]
					});
				});
			};
			for (const name of [
				"create",
				"delete",
				"insertBefore"
			]) {
				const original = workspaceRegistry[name];
				workspaceRegistry[name] = async (...args) => {
					const result = await original.apply(workspaceRegistry, args);
					await this.reconcile();
					return result;
				};
			}
			ctx.effect(() => {
				ctx.on.bind(ctx)("session/disposed", (session) => {
					const id = session && typeof session.id === "string" ? session.id : null;
					if (id === null || !this.pendingDeletes.has(id)) return;
					this.pendingDeletes.delete(id);
					this.deleteArtifact(id);
					this.persistState();
				});
				const stopSweep = timer === void 0 ? void 0 : timer.interval(() => {
					this.sweepPending();
				}, 6e4);
				this.restoreState().then(() => {
					this.sweepPending();
				});
				return () => {
					if (stopSweep !== void 0) stopSweep();
					for (const name of [
						"archiveSession",
						"create",
						"delete",
						"insertBefore"
					]) {
						const original = originalMethods.get(name);
						if (original === void 0) workspaceRegistry[name] = void 0;
						else workspaceRegistry[name] = original;
					}
					if (protoDescriptor === void 0) delete workspaceRegistry.archivedSessionIds;
					else Object.defineProperty(workspaceRegistry, "archivedSessionIds", protoDescriptor);
				};
			}, "session-manager: registry patches");
			this.ready = true;
		}
		/** Workspace-grouped inventory of every session not deleted through this service. */
		async list() {
			await this.sweepPending();
			if (!this.ready) return {
				items: [],
				groups: [],
				archivedCount: 0
			};
			const state = this.readState();
			const archivedVisible = new Set(this.domainDesired(state).filter((id) => !this.deleted.has(id)));
			const records = await this.sessionQuery.listSessions();
			const observations = records.length > 0 ? await this.sessionQuery.readTitleSnapshots(records.map((record) => record.header.id)) : [];
			const titleBy = /* @__PURE__ */ new Map();
			for (const observation of observations) if (observation.status === "fulfilled" && observation.value?.title !== void 0) titleBy.set(observation.sessionId, observation.value.title.title);
			const items = [];
			for (const record of records) {
				const header = record.header;
				const id = String(header.id);
				if (this.deleted.has(id)) continue;
				items.push({
					id,
					title: titleBy.get(id) ?? "",
					createdAt: header.createdAt,
					cwd: header.cwd ?? "",
					archived: archivedVisible.has(id),
					deleted: this.deleted.has(id),
					live: record.live,
					origin: header.origin === "subagent" ? "subagent" : "main",
					parentSession: header.parentSession === void 0 ? "" : String(header.parentSession)
				});
			}
			items.sort((a, b) => b.createdAt - a.createdAt);
			const archivedCount = items.reduce((count, item) => item.archived ? count + 1 : count, 0);
			return {
				items,
				groups: this.buildGroups(items),
				archivedCount
			};
		}
		/** Restore one archived session (removes it from the durable archive set). */
		async restore(sessionId) {
			try {
				return await this.enqueue(async () => {
					if (this.deleted.has(sessionId)) return this.fail("session has been deleted");
					const state = this.readState();
					if (!state.archivedSessionIds.includes(sessionId)) return this.ok(true, "", false, "this session was already restored");
					if (!await this.knownSession(sessionId)) return this.fail("session log no longer exists, cannot restore");
					this.unarchived.add(sessionId);
					const next = state.archivedSessionIds.filter((id) => id !== sessionId);
					await this.writeState({
						...state,
						archivedSessionIds: next
					});
					this.persistState();
					return this.ok(true, "", false, "");
				});
			} catch (error) {
				return this.fail(error instanceof Error ? error.message : String(error));
			}
		}
		/** Restore every currently archived (non-deleted) session. */
		async restoreMany(ids) {
			try {
				return await this.enqueue(async () => {
					const state = this.readState();
					const targets = ids === void 0 ? state.archivedSessionIds.filter((id) => !this.deleted.has(id)) : ids;
					const records = await this.sessionQuery.listSessions();
					const knownIds = new Set(records.map((record) => String(record.header.id)));
					let restored = 0;
					const failures = [];
					const removable = /* @__PURE__ */ new Set();
					for (const id of targets) {
						if (this.deleted.has(id)) {
							failures.push({
								id,
								error: "session has been deleted"
							});
							continue;
						}
						if (!state.archivedSessionIds.includes(id)) continue;
						if (!knownIds.has(id)) {
							failures.push({
								id,
								error: "session log no longer exists, cannot restore"
							});
							continue;
						}
						removable.add(id);
						this.unarchived.add(id);
						restored += 1;
					}
					if (removable.size > 0) {
						const next = state.archivedSessionIds.filter((id) => !removable.has(id));
						await this.writeState({
							...state,
							archivedSessionIds: next
						});
					}
					this.persistState();
					return this.ok(true, "", false, "", 0, restored, failures);
				});
			} catch (error) {
				return this.fail(error instanceof Error ? error.message : String(error));
			}
		}
		/** Archive one session into the registry archive set. */
		async archive(sessionId) {
			try {
				this.requireReady();
				await this.workspaceRegistry.archiveSession(sessionId);
				return this.ok(true, "", false, "");
			} catch (error) {
				return this.fail(error instanceof Error ? error.message : String(error));
			}
		}
		/** Delete one session: un-account, hide, and remove its on-disk log. */
		async deleteSession(sessionId) {
			try {
				return await this.enqueue(async () => {
					const outcome = await this.deleteOne(sessionId);
					if (!outcome.ok) return this.fail(outcome.error);
					return this.ok(true, "", outcome.removedLog, outcome.note);
				});
			} catch (error) {
				return this.fail(error instanceof Error ? error.message : String(error));
			}
		}
		/** Delete the given sessions in one batch. */
		async deleteSessions(ids) {
			if (ids.length === 0) return this.fail("no session ids provided");
			try {
				return await this.enqueue(async () => {
					const records = await this.sessionQuery.listSessions();
					const byId = new Map(records.map((record) => [String(record.header.id), record]));
					let removed = 0;
					const failures = [];
					for (const id of ids) {
						const outcome = await this.deleteOne(id, byId.get(id));
						if (outcome.ok) removed += 1;
						else failures.push({
							id,
							error: outcome.error
						});
					}
					return this.ok(true, "", false, "", removed, 0, failures);
				});
			} catch (error) {
				return this.fail(error instanceof Error ? error.message : String(error));
			}
		}
		/** Delete every currently archived (non-deleted) session. */
		async deleteAllArchived() {
			try {
				return await this.enqueue(async () => {
					const archivedIds = this.readState().archivedSessionIds.filter((id) => !this.deleted.has(id));
					if (archivedIds.length === 0) return this.ok(true, "", false, "", 0, 0, []);
					const records = await this.sessionQuery.listSessions();
					const byId = new Map(records.map((record) => [String(record.header.id), record]));
					let removed = 0;
					const failures = [];
					for (const id of archivedIds) {
						const outcome = await this.deleteOne(id, byId.get(id));
						if (outcome.ok) removed += 1;
						else failures.push({
							id,
							error: outcome.error
						});
					}
					return this.ok(true, "", false, "", removed, 0, failures);
				});
			} catch (error) {
				return this.fail(error instanceof Error ? error.message : String(error));
			}
		}
		requireReady() {
			if (!this.ready || this.domain === null || this.table === null || this.workspaceRegistry === null || this.sessionQuery === null) throw new Error("session-manager: not ready yet");
		}
		readState() {
			this.requireReady();
			return this.domain.global.get();
		}
		writeState(state) {
			return this.domain.global.set(state);
		}
		domainDesired(state) {
			return state.archivedSessionIds.filter((id) => !this.unarchived.has(id));
		}
		async reconcile() {
			const state = this.readState();
			const next = this.domainDesired(state);
			if (sameIds(next, state.archivedSessionIds)) return;
			await this.writeState({
				...state,
				archivedSessionIds: next
			});
		}
		enqueue(task) {
			const run = this.chain.then(task, task);
			this.chain = run.then(() => {}, () => {});
			return run;
		}
		ok(ok, error, removedLog, note, removed = 0, restored = 0, failures = []) {
			return {
				ok,
				error,
				removedLog,
				note,
				removed,
				restored,
				failures
			};
		}
		fail(error) {
			return {
				ok: false,
				error,
				removedLog: false,
				note: "",
				removed: 0,
				restored: 0,
				failures: []
			};
		}
		async knownSession(id) {
			this.requireReady();
			const live = this.ctx.get("sessions");
			if (live !== void 0 && live.get(id) !== void 0) return true;
			return (await this.sessionQuery.listSessions()).some((record) => String(record.header.id) === String(id));
		}
		buildGroups(items) {
			this.requireReady();
			const table = this.table;
			const workspaceOrder = [];
			const sessionWorkspace = /* @__PURE__ */ new Map();
			for (const entry of table.entries()) {
				const wsId = String(entry[0]);
				workspaceOrder.push(wsId);
				const record = entry[1];
				for (const sessionId of record.sessionIds) if (!sessionWorkspace.has(String(sessionId))) sessionWorkspace.set(String(sessionId), wsId);
			}
			const byWorkspace = /* @__PURE__ */ new Map();
			for (const item of items) {
				const wsId = sessionWorkspace.get(item.id);
				if (wsId === void 0) continue;
				const list = byWorkspace.get(wsId);
				if (list === void 0) byWorkspace.set(wsId, [item]);
				else list.push(item);
			}
			const groups = [];
			for (const wsId of workspaceOrder) {
				const sessions = byWorkspace.get(wsId);
				if (sessions === void 0) continue;
				const record = table.get(wsId);
				groups.push({
					key: `ws-${wsId}`,
					workspaceId: wsId,
					title: record === void 0 ? wsId : record.title,
					path: record === void 0 ? "" : record.path,
					sessions
				});
			}
			const ungrouped = items.filter((item) => !sessionWorkspace.has(item.id));
			if (ungrouped.length > 0) groups.push({
				key: "ungrouped",
				workspaceId: "",
				title: "Ungrouped",
				path: "",
				sessions: ungrouped
			});
			return groups;
		}
		async rmDir(target) {
			if (this.subprocess === null) throw new Error("subprocess service is unavailable");
			let handle;
			try {
				handle = this.subprocess.spawn({
					argv: [
						"rm",
						"-rf",
						"--",
						target
					],
					cwd: "/",
					stdio: {
						stdin: "ignore",
						stdout: "ignore",
						stderr: "ignore"
					},
					graceMs: 15e3
				});
			} catch (error) {
				throw new Error(`failed to start rm: ${error instanceof Error ? error.message : String(error)}`);
			}
			try {
				const outcome = await handle.done;
				if (outcome.exitCode !== 0) throw new Error(`artifact deletion exited with code ${String(outcome.exitCode)}`);
			} catch (error) {
				try {
					handle.terminate();
				} catch {}
				throw error;
			}
		}
		async deleteArtifact(sessionId) {
			if (this.sessionPersistence === null) return "persistence service unavailable; log file not removed";
			try {
				const raw = await this.sessionPersistence.readRaw(sessionId);
				if (raw === void 0 || raw.meta === void 0) return "no persisted log artifact found";
				const location = this.sessionPersistence.locate(raw.meta);
				const path = location !== void 0 && typeof location.path === "string" ? location.path : null;
				const fileBase = path === null ? null : basename(path);
				const target = path !== null && path.startsWith("/") && (fileBase === "session.jsonl" || fileBase === "session.jsonl.zstd") && !path.split("/").includes("..") && basename(dirname(path)) === String(sessionId) ? dirname(path) : null;
				if (target === null) return "artifact path validation failed; log file not removed";
				await this.rmDir(target);
				return null;
			} catch (error) {
				return `log removal failed: ${error instanceof Error ? error.message : String(error)}`;
			}
		}
		async deleteOne(sessionId, record) {
			if (record === void 0) record = (await this.sessionQuery.listSessions()).find((r) => String(r.header.id) === String(sessionId));
			if (record === void 0) {
				this.requireReady();
				const purgeState = this.readState();
				if (purgeState.archivedSessionIds.includes(sessionId)) {
					this.deleted.add(sessionId);
					this.unarchived.delete(sessionId);
					const next = purgeState.archivedSessionIds.filter((id) => id !== sessionId);
					await this.writeState({
						...purgeState,
						archivedSessionIds: next
					});
					this.persistState();
					return {
						ok: true,
						error: "",
						note: "cleared archived record for a session whose log no longer exists",
						removedLog: false
					};
				}
				return {
					ok: false,
					error: "session does not exist",
					note: "",
					removedLog: false
				};
			}
			this.requireReady();
			const table = this.table;
			for (const entry of table.entries()) {
				const key = entry[0];
				if (!entry[1].sessionIds.includes(sessionId)) continue;
				await table.update(key, (current) => ({
					...current,
					sessionIds: current.sessionIds.filter((id) => id !== sessionId)
				}));
			}
			this.deleted.add(sessionId);
			this.unarchived.delete(sessionId);
			const state = this.readState();
			if (!state.archivedSessionIds.includes(sessionId)) await this.writeState({
				...state,
				archivedSessionIds: [...state.archivedSessionIds, sessionId]
			});
			if (record.live) {
				this.pendingDeletes.add(sessionId);
				this.persistState();
				return {
					ok: true,
					error: "",
					note: "session removed; its log is queued and will be erased automatically once the session stops",
					removedLog: false
				};
			}
			const note = await this.deleteArtifact(sessionId);
			this.persistState();
			return {
				ok: true,
				error: "",
				note: note ?? "",
				removedLog: note === null
			};
		}
		async sweepPending() {
			if (this.pendingDeletes.size === 0 || this.sweeping) return;
			this.sweeping = true;
			try {
				const records = await this.sessionQuery.listSessions();
				const liveIds = new Set(records.filter((record) => record.live).map((record) => String(record.header.id)));
				let changed = false;
				for (const id of [...this.pendingDeletes]) {
					if (liveIds.has(id)) continue;
					this.pendingDeletes.delete(id);
					changed = true;
					this.deleteArtifact(id);
				}
				if (changed) this.persistState();
			} catch (error) {
				this.ctx.logger.warn("session-manager: pending-delete sweep failed:", error);
			} finally {
				this.sweeping = false;
			}
		}
		async persistState() {
			if (this.statePath === null || this.fsService === null) return;
			try {
				const target = await this.fsService.resolve(this.statePath);
				await this.fsService.writeText(target, JSON.stringify({
					deleted: [...this.deleted],
					pending: [...this.pendingDeletes]
				}));
			} catch (error) {
				this.ctx.logger.warn("session-manager: state persist failed:", error);
			}
		}
		async restoreState() {
			if (this.statePath === null || this.fsService === null) return;
			try {
				const target = await this.fsService.resolve(this.statePath);
				const text = await this.fsService.readText(target);
				const data = JSON.parse(text);
				if (data !== null && typeof data === "object") {
					if (Array.isArray(data.deleted)) {
						for (const id of data.deleted) if (typeof id === "string") this.deleted.add(id);
					}
					if (Array.isArray(data.pending)) {
						for (const id of data.pending) if (typeof id === "string") this.pendingDeletes.add(id);
					}
				}
			} catch {}
		}
	};
})();
//#endregion
export { SessionManagerService, SessionManagerService as default };
