import { useState } from 'react';
import { isMobileDevice } from '../utils/deviceCheck';
import { DesktopLandingView } from '../views/DesktopLandingView';

export const MobileGate = ({ children }) => {
  const [isMobile] = useState(() => isMobileDevice());

  return isMobile ? children : <DesktopLandingView />;
};
