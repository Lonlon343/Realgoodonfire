import { Capacitor } from '@capacitor/core';

export const isMobileDevice = () => {
  if (Capacitor.isNativePlatform()) {
    return true;
  }

  const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';

  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|playbook|silk/i.test(
    userAgent.toLowerCase()
  );
};
