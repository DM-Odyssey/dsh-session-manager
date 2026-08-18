/**
 * Session manager settings page, browser half: a "会话管理" section in the
 * Settings panel. Provides the full session manager over the Host Remote
 * service (`ctx.remote.sessionManager`): workspace-grouped inventory,
 * multi-select, bulk restore/delete, and per-row archive/restore/delete.
 */
import { createElement, useEffect, useState, Fragment } from 'react';
/** Required services: slot registration plus the mounted Remote namespace. */
export const inject = ['slots', 'remote', 'remote.sessionManager'];
/** Set by apply(); the page component calls through it. */
let api;
const css = {
    page: { padding: 16, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 },
    head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 },
    title: { fontWeight: 600, fontSize: 15 },
    sub: { color: 'var(--dsw-alias-label-secondary, #6b6b70)', fontSize: 12 },
    ops: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 0' },
    opsLabel: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
    groupHead: {
        display: 'flex', alignItems: 'baseline', gap: 8, padding: '12px 4px 4px', marginTop: 6,
        borderBottom: '1px solid var(--dsw-alias-border-l1, #e5e5ea)', fontWeight: 600,
    },
    groupPath: { fontWeight: 400, fontSize: 11, color: 'var(--dsw-alias-label-secondary, #6b6b70)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    groupCount: { fontSize: 11, color: 'var(--dsw-alias-label-secondary, #6b6b70)', marginLeft: 'auto' },
    row: {
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
        border: '1px solid var(--dsw-alias-border-l1, #e5e5ea)',
    },
    main: { flex: 1, minWidth: 0 },
    rowTitle: { fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    rowSub: { color: 'var(--dsw-alias-label-secondary, #6b6b70)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 },
    tag: {
        fontSize: 11, padding: '1px 6px', borderRadius: 999, border: '1px solid var(--dsw-alias-border-l2, #c9c9d1)',
        color: 'var(--dsw-alias-label-secondary, #6b6b70)', flex: 'none',
    },
    tagArchived: { borderColor: 'var(--dsw-alias-state-warn-primary, #b8860b)', color: 'var(--dsw-alias-state-warn-primary, #b8860b)' },
    btn: {
        border: '1px solid var(--dsw-alias-border-l2, #c9c9d1)', background: 'transparent',
        color: 'var(--dsw-alias-label-primary, #1c1c1e)', borderRadius: 6, padding: '4px 10px',
        cursor: 'pointer', fontSize: 12, flex: 'none',
    },
    btnDanger: { borderColor: 'var(--dsw-alias-state-error-primary, #d1242f)', color: 'var(--dsw-alias-state-error-primary, #d1242f)' },
    btnDangerConfirm: { background: 'var(--dsw-alias-state-error-primary, #d1242f)', borderColor: 'var(--dsw-alias-state-error-primary, #d1242f)', color: '#fff' },
    btnRestore: { borderColor: 'var(--dsw-alias-state-success-primary, #2ea043)', color: 'var(--dsw-alias-state-success-primary, #2ea043)' },
    btnRestoreConfirm: { background: 'var(--dsw-alias-state-success-primary, #2ea043)', borderColor: 'var(--dsw-alias-state-success-primary, #2ea043)', color: '#fff' },
    error: { padding: '8px 12px', color: 'var(--dsw-alias-state-error-primary, #d1242f)', border: '1px solid var(--dsw-alias-state-error-primary, #d1242f)', borderRadius: 8 },
    note: { padding: '8px 12px', color: 'var(--dsw-alias-state-warn-primary, #b8860b)', border: '1px solid var(--dsw-alias-state-warn-primary, #b8860b)', borderRadius: 8 },
    empty: { padding: 24, textAlign: 'center', color: 'var(--dsw-alias-label-secondary, #6b6b70)' },
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- slot props are structurally loose across packages
function SessionManagerPage(props) {
    const [state, setState] = useState({
        loading: false, error: '', note: '', groups: [], archivedCount: 0,
    });
    const [selected, setSelected] = useState(() => new Set());
    const [confirming, setConfirming] = useState({});
    const [bulkConfirm, setBulkConfirm] = useState(null);
    const currentId = props.useSessions !== undefined
        ? String(props.useSessions((s) => s.current) ?? '')
        : '';
    useEffect(() => { void load(); }, []);
    const allItems = state.groups.flatMap(g => g.sessions);
    const allIds = allItems.map(i => i.id);
    const archivedIds = allItems.filter(i => i.archived).map(i => i.id);
    const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
    useEffect(() => {
        setSelected(prev => {
            const live = new Set(allIds);
            const next = new Set([...prev].filter(id => live.has(id)));
            return next.size === prev.size ? prev : next;
        });
    }, [state.groups]);
    async function load() {
        setState(s => ({ ...s, loading: true, error: '' }));
        try {
            const res = await api.list();
            if (res.ok === false) {
                setState(s => ({ ...s, loading: false, error: res.error }));
            }
            else {
                setState(s => ({ ...s, loading: false, groups: res.value.groups, archivedCount: res.value.archivedCount, error: '' }));
            }
        }
        catch (error) {
            setState(s => ({ ...s, loading: false, error: error instanceof Error ? error.message : String(error) }));
        }
    }
    async function runSingle(method, id, successNote) {
        setState(s => ({ ...s, loading: true, error: '', note: '' }));
        try {
            const res = await api[method](id);
            if (res.ok === false)
                setState(s => ({ ...s, loading: false, error: res.error }));
            else
                setState(s => ({ ...s, loading: false, note: res.value.note !== '' ? res.value.note : successNote }));
        }
        catch (error) {
            setState(s => ({ ...s, loading: false, error: error instanceof Error ? error.message : String(error) }));
        }
        await load();
    }
    async function runBulk(method, args, okNote) {
        setState(s => ({ ...s, loading: true, error: '', note: '' }));
        try {
            const res = await api[method](...args);
            if (res.ok === false)
                setState(s => ({ ...s, loading: false, error: res.error }));
            else
                setState(s => ({ ...s, loading: false, note: okNote(res.value) }));
        }
        catch (error) {
            setState(s => ({ ...s, loading: false, error: error instanceof Error ? error.message : String(error) }));
        }
        await load();
    }
    const toggleOne = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    };
    const forgetOne = (id) => {
        setSelected(prev => {
            if (!prev.has(id))
                return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };
    const rows = (sessions) => sessions.map(item => {
        const isCurrent = currentId !== '' && item.id === currentId;
        const subParts = [];
        if (item.live)
            subParts.push('运行中');
        if (isCurrent)
            subParts.push('当前');
        if (item.origin === 'subagent')
            subParts.push('子代理');
        if (item.cwd !== '')
            subParts.push(item.cwd);
        const children = [
            createElement('input', {
                key: 'sel', type: 'checkbox', checked: selected.has(item.id), disabled: state.loading,
                onChange: () => toggleOne(item.id),
            }),
            createElement('div', { key: 'main', style: css.main }, [
                createElement('div', { key: 't', style: css.rowTitle }, item.title !== '' ? item.title : '(无标题)'),
                createElement('div', { key: 's', style: css.rowSub }, subParts.join(' · ')),
            ]),
        ];
        if (item.archived) {
            children.push(createElement('span', { key: 'tag', style: { ...css.tag, ...css.tagArchived } }, '已归档'));
            children.push(createElement('button', {
                key: 'restore', style: { ...css.btn, ...css.btnRestore }, disabled: state.loading,
                onClick: () => void runSingle('restore', item.id, '已恢复'),
            }, '恢复'));
        }
        else {
            children.push(createElement('button', {
                key: 'archive', style: css.btn, disabled: state.loading,
                onClick: () => void runSingle('archive', item.id, '已归档'),
            }, '归档'));
        }
        children.push(createElement('button', {
            key: 'delete',
            style: confirming[item.id] ? { ...css.btn, ...css.btnDanger, ...css.btnDangerConfirm } : { ...css.btn, ...css.btnDanger },
            disabled: state.loading,
            title: '永久删除该会话（不可恢复）',
            onClick: () => {
                if (!confirming[item.id]) {
                    setConfirming(p => ({ ...p, [item.id]: true }));
                    return;
                }
                setConfirming(p => ({ ...p, [item.id]: false }));
                forgetOne(item.id);
                void runSingle('deleteSession', item.id, '已删除');
            },
        }, confirming[item.id] ? '确认删除？' : '删除'));
        return createElement('div', { key: item.id, style: css.row }, children);
    });
    const groupNodes = state.groups.map(group => {
        const head = createElement('div', { key: 'head', style: css.groupHead }, [
            createElement('span', { key: 't' }, group.title),
            group.path !== ''
                ? createElement('span', { key: 'p', style: css.groupPath }, group.path)
                : null,
            createElement('span', { key: 'c', style: css.groupCount }, `${group.sessions.length} 个`),
        ]);
        return createElement(Fragment, { key: group.key }, [head, ...rows(group.sessions)]);
    });
    return createElement('div', { style: css.page }, [
        createElement('div', { key: 'head', style: css.head }, [
            createElement('div', { key: 'l' }, [
                createElement('div', { key: 't', style: css.title }, '会话管理'),
                createElement('div', { key: 's', style: css.sub }, `已归档 ${state.archivedCount} 个，共 ${allIds.length} 个会话`),
            ]),
            createElement('button', { key: 'r', style: css.btn, disabled: state.loading, onClick: () => void load() }, '刷新'),
        ]),
        createElement('div', { key: 'ops', style: css.ops }, [
            createElement('label', { key: 'all', style: css.opsLabel }, [
                createElement('input', { type: 'checkbox', checked: allSelected, disabled: state.loading || allIds.length === 0, onChange: () => setSelected(allSelected ? new Set() : new Set(allIds)) }),
                ' 全选',
            ]),
            createElement('button', {
                key: 'restoreAll',
                style: bulkConfirm === 'restoreAll' ? { ...css.btn, ...css.btnRestore, ...css.btnRestoreConfirm } : { ...css.btn, ...css.btnRestore },
                disabled: state.loading || archivedIds.length === 0,
                onClick: () => {
                    if (bulkConfirm !== 'restoreAll') {
                        setBulkConfirm('restoreAll');
                        return;
                    }
                    setBulkConfirm(null);
                    void runBulk('restoreMany', [], r => `已恢复 ${r.restored} 个${r.failures.length > 0 ? `，${r.failures.length} 个失败` : ''}`);
                },
            }, bulkConfirm === 'restoreAll' ? `确认恢复全部已归档（${archivedIds.length} 个）？` : `恢复全部已归档 (${archivedIds.length})`),
            createElement('button', {
                key: 'delArchived',
                style: bulkConfirm === 'delArchived' ? { ...css.btn, ...css.btnDanger, ...css.btnDangerConfirm } : { ...css.btn, ...css.btnDanger },
                disabled: state.loading || archivedIds.length === 0,
                title: '永久删除所有已归档的会话（不可恢复）',
                onClick: () => {
                    if (bulkConfirm !== 'delArchived') {
                        setBulkConfirm('delArchived');
                        return;
                    }
                    setBulkConfirm(null);
                    void runBulk('deleteAllArchived', [], r => `已删除 ${r.removed} 个已归档会话${r.failures.length > 0 ? `，${r.failures.length} 个失败` : ''}`);
                },
            }, bulkConfirm === 'delArchived' ? `确认删除全部已归档（${archivedIds.length} 个）？` : `删除全部已归档 (${archivedIds.length})`),
            createElement('button', {
                key: 'delSel',
                style: bulkConfirm === 'selected' ? { ...css.btn, ...css.btnDanger, ...css.btnDangerConfirm } : { ...css.btn, ...css.btnDanger },
                disabled: state.loading || selected.size === 0,
                onClick: () => {
                    if (bulkConfirm !== 'selected') {
                        setBulkConfirm('selected');
                        return;
                    }
                    setBulkConfirm(null);
                    void runBulk('deleteSessions', [[...selected]], r => `已删除 ${r.removed} 个${r.failures.length > 0 ? `，${r.failures.length} 个失败` : ''}`);
                },
            }, bulkConfirm === 'selected' ? `确认删除所选 ${selected.size} 个？` : `删除所选 (${selected.size})`),
            createElement('button', {
                key: 'delAll',
                style: bulkConfirm === 'all' ? { ...css.btn, ...css.btnDanger, ...css.btnDangerConfirm } : { ...css.btn, ...css.btnDanger },
                disabled: state.loading || allIds.length === 0,
                onClick: () => {
                    if (bulkConfirm !== 'all') {
                        setBulkConfirm('all');
                        return;
                    }
                    setBulkConfirm(null);
                    void runBulk('deleteSessions', [allIds], r => `已删除 ${r.removed} 个${r.failures.length > 0 ? `，${r.failures.length} 个失败` : ''}`);
                },
            }, bulkConfirm === 'all' ? `确认全部删除 ${allIds.length} 个？` : '全部删除'),
        ]),
        state.error !== '' ? createElement('div', { key: 'err', style: css.error }, `操作失败：${state.error}`) : null,
        state.note !== '' ? createElement('div', { key: 'note', style: css.note }, state.note) : null,
        createElement('div', { key: 'body' }, allIds.length === 0
            ? createElement('div', { style: css.empty }, state.loading ? '加载中…' : '没有会话')
            : groupNodes),
    ]);
}
/**
 * Client plugin body: mount the Host Remote namespace and register the
 * settings section.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    api = ctx.remote.sessionManager;
    ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'session-manager',
        order: 30,
        label: '会话管理',
    }, SessionManagerPage));
}
//# sourceMappingURL=index.js.map