import { useEffect, useState } from 'react';

// There's no web API for "is the device unlocked" — browsers don't expose
// lock-screen state to pages at all, so that condition from the brief isn't
// something a PWA can detect. Landscape + a wide-enough viewport (roughly
// iPad-and-up; excludes phones held sideways) is the closest real signal.
const MIN_DRIVE_MODE_WIDTH = 900;

export function useDriveModeEligible() {
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

  return { ...state, eligible: state.isLandscape && state.isWideEnough };
}
