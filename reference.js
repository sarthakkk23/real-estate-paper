/* The Real Estate Paper: the reference pages. One job: when motion is welcome (v2.js has set .m3, which it never
   does with reduced motion), a worked picture draws itself the first time it comes into view, including inside a
   "See it work" panel when it is opened. Without .m3 the CSS shows every picture finished, so nothing here is needed
   for the page to be complete. */
(() => {
  const root = document.documentElement;
  if (!("IntersectionObserver" in window)) return;
  const figs = [...document.querySelectorAll(".rf-anim")];
  if (!figs.length) return;
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    requestAnimationFrame(() => e.target.classList.add("go"));
  }), { rootMargin: "0px 0px -8% 0px" });
  figs.forEach((f) => io.observe(f));
  // if motion is switched off later (v2.js drops .m3 when the observer stalls), show everything at once
  if (!root.classList.contains("m3")) figs.forEach((f) => f.classList.add("go"));
})();
