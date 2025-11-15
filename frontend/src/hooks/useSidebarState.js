import { useCallback, useEffect, useState } from "react";

const DESKTOP_BREAKPOINT = 992;

const getViewportWidth = () =>
  typeof window !== "undefined" ? window.innerWidth : DESKTOP_BREAKPOINT;

export function useSidebarState(initialDesktopOpen = true) {
  const [viewportWidth, setViewportWidth] = useState(getViewportWidth);
  const isDesktop = viewportWidth >= DESKTOP_BREAKPOINT;
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    isDesktop ? initialDesktopOpen : false,
  );

  useEffect(() => {
    const handleResize = () => {
      const width = getViewportWidth();
      setViewportWidth(width);
      if (width >= DESKTOP_BREAKPOINT) {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = useCallback(
    () => setIsSidebarOpen((prev) => !prev),
    [],
  );
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  return {
    isSidebarOpen,
    toggleSidebar,
    closeSidebar,
    isMobileView: !isDesktop,
  };
}

