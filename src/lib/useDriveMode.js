import { useEffect, useState } from 'react';

// There's no web API for "is the device unlocked" — browsers don't expose
// lock-screen state to pages at all, so that condition from the original
// brief isn't something a PWA can detect. Landscape + being an actual iPad
// is the real gate now — width alone used to be a rough stand-in for "iPad
// and up," but Drive Console is iPad-exclusive, so device type matters more
// than viewport size.
const MIN_DRIVE_MODE_WIDTH = 820;

function detectIPad() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isLegacyIPad = /iPad/.test(ua);
  // iPadOS 13+ deliberately reports its UA as "Macintosh" for site
  // compatibility, so it's indistinguishable from a real Mac by UA string
  // alone. The reliable workaround: real Macs don't support multi-touch,
  // iPads do — checking maxTouchPoints on a Mac-reporting platform is the
  // standard, honest way to tell them apart. It's a heuristic, not a formal
  // "is this an iPad" API (no such API exists), but it's the accepted one.
  const isModernIPad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isLegacyIPad || isModernIPad;
}

export function useIsIPad() {
  const [isIPad] = useState(detectIPad);
  return isIPad;
}

export function useDriveModeEligible() {
  const isIPad = useIsIPad();
  const [state, setState] = useState(() => ({
    isLandscape: window.innerWidth > window.innerHeight,
    isWideEnough: window.innerWidth >= MIN_DRIVE_MODE_WIDTH,
  }));

  useEffect(() => {
    function update() {
      setState({
        isLandscape: window.innerWidth > window.innerHeight,
        isWideEnough: window.innerWidth >= MIN_DRIVE_MODE_WIDTH,
      });
    }
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return { ...state, isIPad, eligible: isIPad && state.isLandscape && state.isWideEnough };
}
