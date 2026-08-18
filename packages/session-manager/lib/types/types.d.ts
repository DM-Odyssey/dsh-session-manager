/**
 * Wire payload types of the session-manager service. Deliberately plain
 * JSON vocabulary (required scalars, arrays, and empty-string sentinels) so
 * the Typert generator emits stable wire schemas and the browser bundle
 * never crosses non-JSON values.
 * @module @deepseek-ai/dsh-session-manager/src/types
 */
/** One session row in the manager inventory. */
export interface SessionManagerItem {
    /** Session id. */
    id: string;
    /** Latest log-backed title; empty string when the log has none. */
    title: string;
    /** Creation time (epoch ms). */
    createdAt: number;
    /** Working directory; empty string when the session has no cwd. */
    cwd: string;
    /** Whether the session is in the registry archive set and not deleted. */
    archived: boolean;
    /** Whether the session was deleted through this service (filtered out). */
    deleted: boolean;
    /** Whether the session currently exists in the in-memory session store. */
    live: boolean;
    /** Product classification: top-level or subagent child. */
    origin: 'main' | 'subagent';
    /** Fork parent id; empty string when none. */
    parentSession: string;
}
/** One workspace group of session rows. */
export interface SessionManagerGroup {
    /** Stable group key (`ws-<id>` or `ungrouped`). */
    key: string;
    /** Workspace id; empty string for the ungrouped bucket. */
    workspaceId: string;
    /** Workspace display title (Ungrouped for the ungrouped bucket). */
    title: string;
    /** Workspace canonical path; empty string for the ungrouped bucket. */
    path: string;
    /** Sessions belonging to this group, newest first. */
    sessions: SessionManagerItem[];
}
/** Inventory response: flat rows, workspace groups, and the archive count. */
export interface SessionManagerListResult {
    items: SessionManagerItem[];
    groups: SessionManagerGroup[];
    archivedCount: number;
}
/** One failed id inside a batch operation. */
export interface SessionManagerFailure {
    id: string;
    error: string;
}
/**
 * Uniform result envelope. `error` and `note` are empty strings when absent;
 * `removedLog` is false when no log artifact was removed; `removed`/`restored`
 * carry batch counts; `failures` lists per-id failures (empty on success).
 */
export interface SessionManagerResult {
    ok: boolean;
    error: string;
    removedLog: boolean;
    note: string;
    removed: number;
    restored: number;
    failures: SessionManagerFailure[];
}
//# sourceMappingURL=types.d.ts.map