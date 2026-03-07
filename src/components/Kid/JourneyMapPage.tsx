import { GameMapPage } from './GameMapPage';
import { PAWNS_JOURNEY_CONFIG } from '../../data/kidGameConfigs';

export function JourneyMapPage(): JSX.Element {
  return <GameMapPage config={PAWNS_JOURNEY_CONFIG} />;
}
