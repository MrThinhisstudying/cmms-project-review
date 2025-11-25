export function sanitizeSnapshot(entityName: string, obj: any) {
    if (!obj) return obj;
    const clone: any = JSON.parse(JSON.stringify(obj));
    if (entityName === 'User') {
        delete clone.password;
        delete clone.reset_token;
        delete clone.reset_token_expiry;
    }
    return clone;
}

export function computeShallowDiff(beforeObj: any, afterObj: any) {
    if (!beforeObj || !afterObj) return undefined;
    const changed: Record<string, {before: any; after: any}> = {};
    const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
    for (const k of keys) {
        const b = beforeObj[k];
        const a = afterObj[k];
        if (JSON.stringify(b) !== JSON.stringify(a)) {
            changed[k] = {before: b, after: a};
        }
    }
    return Object.keys(changed).length ? changed : undefined;
}

export const TRACKED_ENTITIES = new Set(['User', 'Device', 'Maintenance', 'Department', 'Notification']);
export const isTrackedEntity = (name: string) => TRACKED_ENTITIES.has(name);
