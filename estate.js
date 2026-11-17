// The Real Estate Paper: the few additions to the shared script (v2.js, copied unchanged). Progressive only: every page
// is complete without this file, and with reduced motion nothing here moves.
(() => {
  const root = document.documentElement;
  root.classList.add("re-js");                       // this file ran: the filter can show (v2's "js" may be dropped on a slow tab)
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // ---------- insights: filter the findings by what the reader is doing ----------
  const chips = $$(".re-chip");
  if (chips.length) {
    const all = chips.find((c) => c.classList.contains("re-chip-all"));
    const apply = (want) => {
      chips.forEach((c) => c.setAttribute("aria-pressed", String(want ? c.dataset.doing === want : c === all)));
      $$(".re-flist li, .re-tile").forEach((li) => { li.hidden = !!want && !li.dataset.doing.split(" ").includes(want); });
      $$(".re-chap").forEach((s) => { s.hidden = $$(".re-flist li, .re-tile", s).every((li) => li.hidden); });
    };
    chips.forEach((c) => c.addEventListener("click", () => apply(c === all ? "" : c.dataset.doing)));
  }

  // ---------- motion: only where v2.js turned on its third pass (.m3), which it never does with reduced motion ----------
  if (!root.classList.contains("m3") || !("IntersectionObserver" in window)) return;
  const loader = document.querySelector(".loader");
  const curtain = !!document.querySelector(".curtain") && !root.classList.contains("seen");
  const lag = curtain ? 1500 : loader && getComputedStyle(loader).display !== "none" ? 700 : 0;
  const once = (els, fn, margin = "0px 0px -12% 0px") => {
    if (!els.length) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); fn(e.target); } }), { rootMargin: margin });
    els.forEach((el) => io.observe(el));
  };
  const inHero = (el) => !!el.closest(".hero");

  // a figure's digits roll into place, one after another; a hidden copy keeps it whole for screen readers
  const roll = (el) => {
    if (el.dataset.rolled) return;
    el.dataset.rolled = "1";
    const t = [...el.childNodes].find((n) => n.nodeType === 3 && n.nodeValue.trim());
    if (!t) return;
    const whole = document.createElement("span");
    whole.className = "vh";
    whole.textContent = el.textContent;
    const frag = document.createDocumentFragment();
    [...t.nodeValue].forEach((ch, i) => {
      const o = document.createElement("span"), s = document.createElement("span");
      o.className = "rc"; o.setAttribute("aria-hidden", "true");
      s.textContent = ch; s.style.setProperty("--c", i);
      o.append(s); frag.append(o);
    });
    t.replaceWith(frag);
    const small = el.querySelector("small");
    if (small) small.setAttribute("aria-hidden", "true");
    el.append(whole);
  };
  once($$(".re-num[data-roll]"), (el) => setTimeout(() => roll(el), inHero(el) ? lag + 250 : 100));

  // the scheme fills in, year by year, as the land index rises; the zones arrive in number order; on a finding's page a
  // plot grows as its rate falls (L2), the band opens round a comparable (L3), the published prices move apart (L5)
  once($$("[data-plots], [data-zones], [data-sizes], [data-band], [data-dots]"), (el) => setTimeout(() => el.classList.add("go"), inHero(el) ? lag + 300 : 150), "0px 0px -15% 0px");
})();
