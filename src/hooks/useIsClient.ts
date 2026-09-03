"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * False during SSR and the hydration render, true afterwards. Lets a component
 * read browser-only capabilities during render without a hydration mismatch
 * and without setting state inside an effect.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
