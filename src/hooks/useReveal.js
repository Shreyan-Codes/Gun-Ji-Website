import { useEffect } from "react";

// Adds .in to .reveal elements as they enter the viewport.
// Re-runs whenever `key` changes (e.g. on route change) so newly
// mounted pages get observed too. Respects prefers-reduced-motion.
export default function useReveal(key) {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal:not(.in)");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i * 60, 300)}ms`;
      io.observe(el);
    });
    return () => io.disconnect();
  }, [key]);
}
