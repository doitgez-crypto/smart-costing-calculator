"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { logSecurityEvent } from "@/app/actions/security";

/**
 * Advanced Client-Side Deterrence:
 * Disables right-click, F12, and various DevTools/source-viewing shortcuts.
 * Logs incidents to the server for audit.
 */
export function ClientSecurity() {
  const pathname = usePathname();

  useEffect(() => {
    // Only apply protection to sensitive pages: calculator (/) and admin (/admin)
    const protectedPaths = ["/", "/admin"];
    const isProtected = protectedPaths.includes(pathname);

    if (!isProtected) return;

    // 0. Throttled logging to prevent server flooding
    let lastLogTime = 0;
    const throttledLog = (event: string) => {
      const now = Date.now();
      if (now - lastLogTime > 2000) { // 2 second cooldown
        lastLogTime = now;
        logSecurityEvent(event);
      }
    };

    // 1. Block right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      throttledLog("RIGHT_CLICK_BLOCKED");
      return false;
    };

    // 2. Block keyboard shortcuts (F12, Inspect, View Source, Save)
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      let deterred = false;
      let eventType = "";

      // F12
      if (e.key === "F12") {
        deterred = true;
        eventType = "F12_KEY_BLOCKED";
      }

      // Ctrl/Cmd + Shift + I/J/C (DevTools/Inspect/Console)
      if (isCmdOrCtrl && isShift && ["I", "J", "C"].includes(e.key.toUpperCase())) {
        deterred = true;
        eventType = `DEVTOOLS_SHORTCUT_BLOCKED_${e.key.toUpperCase()}`;
      }

      // Ctrl/Cmd + U (View Source)
      if (isCmdOrCtrl && e.key.toUpperCase() === "U") {
        deterred = true;
        eventType = "VIEW_SOURCE_BLOCKED";
      }

      // Ctrl/Cmd + S (Save Page)
      if (isCmdOrCtrl && e.key.toUpperCase() === "S") {
        deterred = true;
        eventType = "SAVE_PAGE_BLOCKED";
      }

      if (deterred) {
        e.preventDefault();
        throttledLog(eventType);
        return false;
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    // 3. Console "Hijacking" Deterrence
    const consoleInterval = setInterval(() => {
      console.clear();
      console.log(
        "%c STOP! ",
        "color: white; background: red; font-size: 50px; font-weight: bold; border-radius: 10px; padding: 10px; border: 5px solid darkred;"
      );
      console.log(
        "%cAuthorized Personnel Only. Security logs are active. Unauthorized access attempts are recorded.",
        "color: red; font-size: 16px; font-weight: bold; margin-top: 10px;"
      );
    }, 1000);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      clearInterval(consoleInterval);
    };
  }, [pathname]);

  return null;
}