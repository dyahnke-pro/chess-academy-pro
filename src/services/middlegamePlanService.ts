import { db } from '../db/schema';
import type { MiddlegamePlan } from '../types';

/**
 * Get all middlegame plans for a specific opening.
 */
export async function getPlansForOpening(openingId: string): Promise<MiddlegamePlan[]> {
  return db.middlegamePlans.where('openingId').equals(openingId).toArray();
}

/**
 * Get a single middlegame plan by ID.
 */
export async function getPlanById(id: string): Promise<MiddlegamePlan | undefined> {
  return db.middlegamePlans.get(id);
}

/**
 * Get all middlegame plans across all openings.
 */
export async function getAllPlans(): Promise<MiddlegamePlan[]> {
  return db.middlegamePlans.toArray();
}

/**
 * Store middlegame plans (idempotent via bulkPut).
 */
export async function storePlans(plans: MiddlegamePlan[]): Promise<void> {
  await db.middlegamePlans.bulkPut(plans);
}

/**
 * Count plans for an opening.
 */
export async function countPlans(openingId: string): Promise<number> {
  return db.middlegamePlans.where('openingId').equals(openingId).count();
}
