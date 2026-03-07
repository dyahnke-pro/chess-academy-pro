import { GameChapterPage } from './GameChapterPage';
import { PAWNS_JOURNEY_CONFIG } from '../../data/kidGameConfigs';

export function JourneyChapterPage(): JSX.Element {
  return <GameChapterPage config={PAWNS_JOURNEY_CONFIG} />;
}
