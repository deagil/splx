import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";

type ScrollFlag = ScrollBehavior | false;

export function useScrollToBottom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  
  // Track if we should stick to bottom (auto-scroll as content arrives)
  const shouldStickRef = useRef(true);
  // Track last scroll position to detect scroll direction
  const lastScrollTopRef = useRef(0);
  // Debounce timer for re-enabling stick
  const stickDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const { data: scrollBehavior = false, mutate: setScrollBehavior } =
    useSWR<ScrollFlag>("messages:should-scroll", null, { fallbackData: false });

  const handleScroll = useCallback(() => {
    if (!containerRef.current) {
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

    // Check if we are within 100px of the bottom
    const atBottom = scrollTop + clientHeight >= scrollHeight - 100;
    setIsAtBottom(atBottom);
    
    // Detect if user scrolled UP (away from bottom)
    const scrolledUp = scrollTop < lastScrollTopRef.current - 5; // 5px threshold
    lastScrollTopRef.current = scrollTop;
    
    // If user scrolled up, immediately disable stick
    if (scrolledUp && !atBottom) {
      shouldStickRef.current = false;
      // Clear any pending re-enable
      if (stickDebounceRef.current) {
        clearTimeout(stickDebounceRef.current);
        stickDebounceRef.current = null;
      }
    }
    
    // If at bottom, re-enable stick after a short delay
    // This prevents accidental re-enabling during scroll momentum
    if (atBottom && !shouldStickRef.current) {
      if (stickDebounceRef.current) {
        clearTimeout(stickDebounceRef.current);
      }
      stickDebounceRef.current = setTimeout(() => {
        if (containerRef.current) {
          const { scrollTop: st, scrollHeight: sh, clientHeight: ch } = containerRef.current;
          if (st + ch >= sh - 50) {
            shouldStickRef.current = true;
          }
        }
      }, 300);
    }
  }, []);

  // Auto-scroll to bottom when content changes (stick to bottom behavior)
  const scrollToBottomIfStuck = useCallback(() => {
    if (!containerRef.current || !shouldStickRef.current) {
      return;
    }
    
    const container = containerRef.current;
    // Use instant scroll for content updates to keep up with streaming
    container.scrollTop = container.scrollHeight;
    lastScrollTopRef.current = container.scrollTop;
  }, []);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const container = containerRef.current;
    lastScrollTopRef.current = container.scrollTop;

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        // Auto-scroll if stuck to bottom
        scrollToBottomIfStuck();
        handleScroll();
      });
    });

    const mutationObserver = new MutationObserver(() => {
      requestAnimationFrame(() => {
        // Auto-scroll if stuck to bottom when content changes
        scrollToBottomIfStuck();
      });
    });

    resizeObserver.observe(container);
    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    handleScroll();

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      if (stickDebounceRef.current) {
        clearTimeout(stickDebounceRef.current);
      }
    };
  }, [handleScroll, scrollToBottomIfStuck]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  useEffect(() => {
    if (scrollBehavior && containerRef.current) {
      const container = containerRef.current;
      const scrollOptions: ScrollToOptions = {
        top: container.scrollHeight,
        behavior: scrollBehavior,
      };
      container.scrollTo(scrollOptions);
      setScrollBehavior(false);
      // When manually scrolling to bottom, re-enable stick
      shouldStickRef.current = true;
      lastScrollTopRef.current = container.scrollHeight;
    }
  }, [scrollBehavior, setScrollBehavior]);

  const scrollToBottom = useCallback(
    (currentScrollBehavior: ScrollBehavior = "smooth") => {
      setScrollBehavior(currentScrollBehavior);
      // Re-enable stick when user clicks scroll to bottom
      shouldStickRef.current = true;
    },
    [setScrollBehavior]
  );

  function onViewportEnter() {
    setIsAtBottom(true);
    shouldStickRef.current = true;
  }

  function onViewportLeave() {
    setIsAtBottom(false);
  }

  return {
    containerRef,
    endRef,
    isAtBottom,
    scrollToBottom,
    onViewportEnter,
    onViewportLeave,
  };
}
