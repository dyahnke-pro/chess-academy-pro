import type { ReactElement } from 'react';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { getRouteFeatureRequirement } from '../../services/featureGates';
import { isFeatureAvailable } from '../../services/featureGates';
import { UpgradePrompt } from './UpgradePrompt';

interface ProRouteProps {
  pathname: string;
  children: ReactElement;
}

export function ProRoute({ pathname, children }: ProRouteProps): ReactElement {
  const tier = useSubscriptionStore((s) => s.tier);
  const requiredFeature = getRouteFeatureRequirement(pathname);

  if (!requiredFeature || isFeatureAvailable(requiredFeature, tier)) {
    return children;
  }

  return <UpgradePrompt feature={requiredFeature} />;
}
