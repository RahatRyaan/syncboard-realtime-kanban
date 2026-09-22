/**
 * Base optimistic concurrency entity interface.
 * Any mutable entity in SyncBoard must extend VersionedEntity.
 */
export interface VersionedEntity {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

/**
 * Payload interface for mutations enforcing optimistic concurrency.
 */
export interface ExpectedVersionPayload {
  expectedVersion: number;
}
