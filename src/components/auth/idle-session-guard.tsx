"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { IDLE_LOGOUT_TIMEOUT_MS, ROUTE_STORAGE_KEY } from "@/lib/session-policy";

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "click",
  "focus",
  "keydown",
  "mousemove",
  "scroll",
  "touchstart",
];

export default function IdleSessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const timeoutRef = useRef<number | null>(null);
  const isSigningOutRef = useRef(false);

  useEffect(() => {
    if (!session.data?.session) return;

    const clearIdleTimeout = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const performSignOut = async () => {
      if (isSigningOutRef.current) return;
      isSigningOutRef.current = true;
      window.localStorage.removeItem(ROUTE_STORAGE_KEY);

      await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.replace("/login");
          },
        },
      });

      router.replace("/login");
    };

    const scheduleIdleTimeout = () => {
      clearIdleTimeout();
      timeoutRef.current = window.setTimeout(() => {
        void performSignOut();
      }, IDLE_LOGOUT_TIMEOUT_MS);
    };

    const handleActivity = () => {
      if (document.visibilityState === "hidden") return;
      scheduleIdleTimeout();
    };

    scheduleIdleTimeout();

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    document.addEventListener("visibilitychange", handleActivity);

    return () => {
      clearIdleTimeout();
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleActivity);
      isSigningOutRef.current = false;
    };
  }, [pathname, router, session.data?.session]);

  return null;
}