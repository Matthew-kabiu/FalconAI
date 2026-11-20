// One global tooltip instance, mounted once in main.tsx (Vite-Build-Template §6.2).
// Anchor with data-tooltip-id={APP_TOOLTIP_ID} data-tooltip-content="…".
import { Tooltip } from 'react-tooltip';

export const APP_TOOLTIP_ID = 'app-tooltip';

export function AppTooltip() {
  return <Tooltip id={APP_TOOLTIP_ID} />;
}
