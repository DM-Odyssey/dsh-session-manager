import type { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { SessionManagerListResult, SessionManagerResult } from './types.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        sessionManager: SessionManagerService;
    }
}
/** The session-manager service: durable restore/delete + inventory. */
export declare class SessionManagerService extends TypertRemoteService {
    /** Hard dependencies: the service only activates after these exist. */
    static inject: string[];
    private domain;
    private table;
    private workspaceRegistry;
    private sessionQuery;
    private sessionPersistence;
    private subprocess;
    private fsService;
    private statePath;
    /** True once the workspace domain is open and the registry patches applied. */
    private ready;
    /** Ids restored by this service (removed from the durable archive set). */
    private readonly unarchived;
    /** Ids deleted by this service (kept in the durable set so frames hide them). */
    private readonly deleted;
    /** Live sessions whose on-disk log deletion is deferred until they stop. */
    private readonly pendingDeletes;
    private chain;
    private sweeping;
    constructor(ctx: Context);
    private init;
    /** Workspace-grouped inventory of every session not deleted through this service. */
    list(): Promise<SessionManagerListResult>;
    /** Restore one archived session (removes it from the durable archive set). */
    restore(sessionId: string): Promise<SessionManagerResult>;
    /** Restore every currently archived (non-deleted) session. */
    restoreMany(ids?: string[]): Promise<SessionManagerResult>;
    /** Archive one session into the registry archive set. */
    archive(sessionId: string): Promise<SessionManagerResult>;
    /** Delete one session: un-account, hide, and remove its on-disk log. */
    deleteSession(sessionId: string): Promise<SessionManagerResult>;
    /** Delete the given sessions in one batch. */
    deleteSessions(ids: string[]): Promise<SessionManagerResult>;
    /** Delete every currently archived (non-deleted) session. */
    deleteAllArchived(): Promise<SessionManagerResult>;
    private requireReady;
    private readState;
    private writeState;
    private domainDesired;
    private reconcile;
    private enqueue;
    private ok;
    private fail;
    private knownSession;
    private buildGroups;
    private rmDir;
    private deleteArtifact;
    private deleteOne;
    private sweepPending;
    private persistState;
    private restoreState;
}
export default SessionManagerService;
//# sourceMappingURL=index.d.ts.map