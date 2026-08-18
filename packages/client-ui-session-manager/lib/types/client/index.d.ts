import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/** Required services: slot registration plus the mounted Remote namespace. */
export declare const inject: string[];
/**
 * Client plugin body: mount the Host Remote namespace and register the
 * settings section.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map