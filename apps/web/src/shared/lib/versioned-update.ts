import { VersionedEntity } from '@syncboard/shared-types';

/**
 * Applies a remote socket or API update to a local entity only if the incoming
 * version is strictly newer, preventing outdated echoes from clobbering optimistic state.
 */
export function applyVersionedUpdate<T extends VersionedEntity>(
  current: T,
  incoming: T,
): { entity: T; updated: boolean } {
  if (incoming.version > current.version) {
    return { entity: incoming, updated: true };
  }
  return { entity: current, updated: false };
}

/**
 * Optimistically increments an entity's version for immediate UI feedback.
 */
export function createOptimisticPatch<T extends VersionedEntity>(
  current: T,
  patch: Partial<T>,
): T {
  return {
    ...current,
    ...patch,
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
  };
}
