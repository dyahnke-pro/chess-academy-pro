import { GameMapPage } from './GameMapPage';
import { FAIRY_TALE_CONFIG } from '../../data/kidGameConfigs';

export function FairyTaleMapPage(): JSX.Element {
  return <GameMapPage config={FAIRY_TALE_CONFIG} />;
}
