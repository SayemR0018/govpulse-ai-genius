import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    if (mql.addEventListener) {
      mql.addEventListener("change", onChange);
    } else if ("addListener" in mql) {
      (mql as { addListener: (cb: () => void) => void }).addListener(onChange);
    }

    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", onChange);
      } else if ("removeListener" in mql) {
        (mql as { removeListener: (cb: () => void) => void }).removeListener(onChange);
      }
    };
  }, []);

  return !!isMobile;
}
