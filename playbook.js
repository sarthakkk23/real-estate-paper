// The Real Estate Paper: the playbook's few additions to the shared script. Progressive only: every page is complete
// without this file, and with reduced motion (no .m3) nothing here moves.
(() => {
  const root = document.documentElement;
  if (!("IntersectionObserver" in window)) return;
  const list = document.querySelector(".pb-three");
  if (!list) return;
  // the three things to do: once on screen, their numbers count in one after another
  const go = () => {
    if (!root.classList.contains("m3")) return;
    [...list.children].forEach((li, i) => li.style.setProperty("--i", i));
    list.classList.add("pb-go");
  };
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.disconnect(); go(); } }), { rootMargin: "0px 0px -15% 0px" });
  io.observe(list);
})();
