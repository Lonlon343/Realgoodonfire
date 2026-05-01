import { useState, useEffect } from 'react';
import { isMobileDevice } from '../utils/deviceCheck';
import { DesktopLandingView } from '../views/DesktopLandingView';

export const MobileGate = ({ children }) => {
  const [isMobile, setIsMobile] = useState(null);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  if (isMobile === null) return null;

  return isMobile ? children : <DesktopLandingView />;
};
