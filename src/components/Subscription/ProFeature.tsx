import type { ReactNode, ReactElement } from 'react';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import type { ProFeatureId } from '../../types/subscription';
import { UpgradePrompt } from './UpgradePrompt';

interface ProFeatureProps {
  feature: ProFeatureId;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProFeature({
  feature,
  children,
  fallback,
}: ProFeatureProps): ReactElement {
  const canUse = useSubscriptionStore((s) => s.canUseFeature)(feature);

  if (canUse) {
    return <>{children}</>;
  }

  return <>{fallback ?? <UpgradePrompt feature={feature} />}</>;
}
