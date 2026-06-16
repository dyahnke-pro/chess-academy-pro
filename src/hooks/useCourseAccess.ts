import { useEntitlementStore, selectIsPro, isPaywallGateEnabled } from '../stores/entitlementStore';
import { resolveCourseAccess, type CourseAccess } from '../services/courseEntitlement';

/**
 * Per-course access for the pay-per-class seam. Reads the dormant paywall flag +
 * the global Pro state; `ownedCourseIds` is wired when an à-la-carte purchase
 * flow lands (empty for now, so the gate — even if flipped on — only Pro-gates).
 * Today the flag is off, so this always returns full access.
 */
export function useCourseAccess(courseId: string, ownedCourseIds: string[] = []): CourseAccess {
  const isPro = useEntitlementStore(selectIsPro);
  return resolveCourseAccess(isPaywallGateEnabled(), isPro, ownedCourseIds.includes(courseId));
}
