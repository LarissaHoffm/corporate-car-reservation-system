import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT) {
  const getMatches = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.(`(max-width: ${breakpoint - 1}px)`).matches;

  const [isMobile, setIsMobile] = React.useState<boolean>(() =>
    Boolean(getMatches()),
  );

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => setIsMobile(mql.matches);
    setIsMobile(mql.matches);

    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return isMobile;
}
