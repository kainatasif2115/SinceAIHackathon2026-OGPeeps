"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** True once (or while, with `once: false`) the element is on screen. */
export function useInView<T extends Element>({
  once = true,
  threshold = 0.25,
  rootMargin = "0px",
}: { once?: boolean; threshold?: number; rootMargin?: string } = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [once, threshold, rootMargin]);
  return { ref, inView };
}

/**
 * Lifts its content into place the first time it scrolls into view. Used for
 * section headings only; with reduced motion it simply appears.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3 });
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-[opacity,translate] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
        inView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A thin magenta line along the top of the page showing how far you have read. */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? window.scrollY / max : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${progress})`;
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px]">
      <div ref={bar} className="bg-brand h-full origin-left scale-x-0" />
    </div>
  );
}

/** Counts up to `value` once it scrolls into view (instantly with reduced motion). */
export function CountUp({
  value,
  decimals = 0,
  suffix = "",
  duration = 1400,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  duration?: number;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>({ threshold: 0.6 });
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      const frame = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(frame);
    }
    let frame = 0;
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(value * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration]);
  return (
    <span ref={ref} className="tabular-nums">
      <span aria-hidden>
        {shown.toFixed(decimals)}
        {suffix}
      </span>
      <span className="sr-only">
        {value.toFixed(decimals)}
        {suffix}
      </span>
    </span>
  );
}

const noSubscribe = () => () => {};

/** True when the visitor asked their device for less motion (false while rendering on the server). */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(noSubscribe, prefersReducedMotion, () => false);
}

/**
 * How far the reader has scrolled through a tall, pinned section: 0 when its
 * top reaches the top of the screen, 1 when its bottom reaches the bottom.
 */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const p = travel > 0 ? -rect.top / travel : 0;
      setProgress(Math.min(1, Math.max(0, p)));
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return { ref, progress };
}

/**
 * Like useScrollProgress, but without re-rendering: `onFrame` receives a
 * smoothed progress (0-1) every animation frame while it is still moving,
 * eased toward the real scroll position so jumpy wheel input glides.
 */
export function useSmoothScrollProgress<T extends HTMLElement>(
  onFrame: (progress: number) => void,
  smoothing = 0.14,
) {
  const ref = useRef<T | null>(null);
  const callback = useRef(onFrame);
  useEffect(() => {
    callback.current = onFrame;
  });
  useEffect(() => {
    let frame = 0;
    let current = -1;
    function target() {
      const el = ref.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      return travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
    }
    function tick() {
      frame = 0;
      const goal = target();
      const reduced = prefersReducedMotion();
      current = current < 0 || reduced ? goal : current + (goal - current) * smoothing;
      if (Math.abs(goal - current) < 0.0005) current = goal;
      callback.current(current);
      if (current !== goal) frame = requestAnimationFrame(tick);
    }
    function wake() {
      if (!frame) frame = requestAnimationFrame(tick);
    }
    wake();
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", wake);
    return () => {
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", wake);
      cancelAnimationFrame(frame);
    };
  }, [smoothing]);
  return ref;
}
