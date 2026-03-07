import { GameChapterPage } from './GameChapterPage';
import { FAIRY_TALE_CONFIG } from '../../data/kidGameConfigs';

export function FairyTaleChapterPage(): JSX.Element {
  return <GameChapterPage config={FAIRY_TALE_CONFIG} />;
}
