// The Real Estate Paper: the tools. Arithmetic on the reader's own inputs only, with every rate, step and band read from
// the page's own data block. No number lives here: the only constants are units (100 for a percentage, a lakh,
// a crore). No network, no storage of what is typed. The arithmetic (TL below) is checked on worked cases against a
// second, separately written version.
(function (root, factory) {
  const TL = factory();
  if (typeof module === "object" && module.exports) module.exports = TL;
  else root.TL = TL;
})(typeof self !== "undefined" ? self : this, function () {
  const LAKH = 1e5, CRORE = 1e7, MINUS = "−";
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const halfUp = (x) => Math.floor(x + 0.5);
  const group = (s) => (s.length <= 3 ? s : s.slice(0, -3).replace(/\B(?=(\d{2})+$)/g, ",") + "," + s.slice(-3));
  const inr = (n) => (n < 0 ? "-" : "") + "₹" + group(String(Math.abs(Math.trunc(n))));
  const words = (n) => {
    let v, unit;
    if (n >= CRORE) { v = halfUp(n / LAKH) / 100; unit = "crore"; }
    else if (n >= LAKH) { v = halfUp(n / 1000) / 100; unit = "lakh"; }
    else return inr(n);
    const [whole, dec] = v.toFixed(2).split(".");
    return "₹" + group(whole) + (dec === "00" ? "" : "." + dec) + " " + unit;
  };
  const both = (n) => (n < LAKH ? words(n) : words(n) + " (" + inr(n) + ")");
  const shareTxt = (part, whole) => (halfUp(part * 10000 / whole) / 100).toFixed(2) + "%";
  const rateTxt = (v) => String(v) + "%";
  const signed = (p, d = 1) => (p > 0 ? "+" : p < 0 ? MINUS : "") + Math.abs(p).toFixed(d) + "%";
  const dateTxt = (iso) => { const [y, m, d] = iso.split("-"); return Number(d) + " " + MONTHS[Number(m) - 1] + " " + y; };
  const tpl = (t, o) => String(t).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
  // a typed number: digits, commas, an optional ₹, and an optional "lakh" or "crore" after it
  const parseNum = (text, mult = 1, whole = false) => {
    let s = String(text == null ? "" : text).trim().toLowerCase();
    if (!s) return { why: "empty" };
    const rupees = /₹|rs|inr/.test(s);                 // a rupee sign means rupees, whatever the unit buttons say
    s = s.replace(/₹|rs\.?|inr|\/-/g, "").replace(/[\s,]/g, "");
    const suf = s.match(/(crores?|cr|lakhs?|lacs?|l)$/);
    let m = rupees ? 1 : mult;
    if (suf) { m = suf[1][0] === "c" ? CRORE : LAKH; s = s.slice(0, -suf[1].length); }
    if (/^[-−]\d*\.?\d+$/.test(s)) return { why: "neg" };
    if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return { why: "text" };
    let n = parseFloat(s) * m;
    if (whole) n = Math.round(n);
    if (!isFinite(n) || n > Number.MAX_SAFE_INTEGER / 1e4) return { why: "big" };
    if (n === 0) return { why: "zero" };
    return { n };
  };
  // ---- tool 2 ----
  const cost = (T, V, cat) => {
    const rates = {}; T.rates.forEach((r) => { rates[r.id] = r; });
    const c = T.categories.find((x) => x.id === cat);
    const out = [], amt = {};
    T.lines.forEach((ln) => {
      let rid = ln.rate === "category" ? c.duty : ln.rate;
      const low = !!ln.rate_if_value_up_to_threshold && V <= T.threshold_inr;
      if (low) rid = ln.rate_if_value_up_to_threshold;
      const base = ln.of === "value" ? V : amt[ln.of];
      const a = halfUp(base * rates[rid].value / 100);
      amt[ln.line] = a;
      out.push({ line: ln.line, rid, rate: rates[rid].value, low, amount: a, notification: rates[rid].notification, dated: rates[rid].dated });
    });
    const total = Object.values(amt).reduce((s, x) => s + x, 0);
    return { lines: out, total, share: shareTxt(total, V) };
  };
  // ---- tool 1b ----
  const adjust = (A, R, use, bFrom, cFrom, bTo, cTo) => {
    const bands = {}; A.bands[use].forEach((b) => { bands[b.label] = b; });
    const fs = (1 + bands[bTo].pct / 100) / (1 + bands[bFrom].pct / 100);
    const k = A.corner[use].pct / 100;
    const fc = (cTo ? 1 + k : 1) / (cFrom ? 1 + k : 1);
    const rate = R * fs * fc;
    const w = A.band80_pct / 100;
    return { rate: halfUp(rate), lo: halfUp(rate * (1 - w)), hi: halfUp(rate * (1 + w)), fs, fc };
  };
  // ---- tool 3 ----
  const stampBase = (L, units, use, side, road, rate, rateUnit, area, areaUnit, price) => {
    const rateM = rateUnit === "sqft" ? rate * units.sqft : rate;
    const areaM = areaUnit === "sqyd" ? area * units.sqyd : area;
    const band = L.bands.find((b) => b.id === road);
    const m = side === "interior" ? 1 : (use === "commercial" ? ("m_com" in band ? band.m_com : band.m) : band.m);
    const cv = halfUp(rateM * m * areaM);
    const v = price ? Math.max(price, cv) : cv;
    return { cv, m, v, areaM, rateM, cmp: !price ? "none" : price > cv ? "price" : cv > price ? "cv" : "equal" };
  };
  const sizeLabel = (b, unit, sqyd) => {
    if (unit === "sqyd") {
      const lo = group(String(halfUp(b.lo / sqyd)));
      return b.hi == null ? "about " + lo + " sq yd and over" : "about " + lo + " to " + group(String(halfUp(b.hi / sqyd))) + " sq yd";
    }
    const lo = group(String(b.lo));
    return b.hi == null ? lo + " sq m and over" : lo + " to " + group(String(b.hi)) + " sq m";
  };
  const roadLabel = (id) => (/ and over$/.test(id) ? id.replace(/ and over$/, " ft and over") : id.replace(/-/g, " to ") + " ft");
  return { halfUp, group, inr, words, both, shareTxt, rateTxt, signed, dateTxt, tpl, parseNum, cost, adjust, stampBase, sizeLabel, roadLabel };
});

// ---------- the pages ----------
(() => {
  if (typeof document === "undefined") return;
  const cfgEl = document.getElementById("tl-cfg");
  const root = document.documentElement;
  root.classList.add("tl-js");
  const calm = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (calm) root.classList.add("tl-anim");
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const E = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const here = () => location.origin + location.pathname;

  // copying the result as one line: the line is on the page too, so it can be selected by hand
  const copyWords = cfgEl ? JSON.parse(cfgEl.textContent).c || {} : {};
  $$("[data-copy-line]").forEach((btn) => btn.addEventListener("click", async () => {
    const box = btn.closest(".tl-copy"), line = $(".tl-line", box), status = $(".tl-copied", box);
    const text = line.textContent.trim();
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      try {
        const r = document.createRange(); r.selectNodeContents(line);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
        ok = document.execCommand("copy");
      } catch (e2) { ok = false; }
    }
    status.textContent = ok ? copyWords.copied || "" : copyWords.failed || "";
  }));
  if (!cfgEl) return;
  const C = JSON.parse(cfgEl.textContent), W = C.w, TL = window.TL;
  const form = $("form.tl-form");
  if (!form) return;
  const val = (name) => { const el = form.elements[name]; return el ? (el.value !== undefined ? el.value : "") : ""; };
  const radio = (name) => { const el = $$(`input[name="${name}"]`, form).find((x) => x.checked); return el ? el.value : ""; };
  const mult = (u) => (u === "lakh" ? 1e5 : u === "crore" ? 1e7 : 1);
  const say = $('[data-o="say"]'), more = $('[data-o="more"]'), band = $('[data-o="band"]'), line = $('[data-o="line"]');
  const tick = (el) => { if (!calm || !el) return; el.classList.remove("tl-tick"); void el.offsetWidth; el.classList.add("tl-tick"); };
  const fail = (msg) => {
    say.textContent = msg; say.classList.add("tl-err");
    if (more) more.hidden = true;
  };
  const okay = () => { say.classList.remove("tl-err"); if (more) more.hidden = false; };
  const errMsg = (why, prefix = "") => prefix + (W["err_" + why] || W.err_text);

  // ---------- tool 2: all-in cost ----------
  if (C.tool === "cost") {
    const T = C.t, rows = $('[data-o="rows"]'), echo = $('[data-o="echo"]');
    const cats = {}; T.categories.forEach((c) => { cats[c.id] = c.label; });
    const m = /^#v=(\d+)$/.exec(location.hash);
    if (m) { form.elements["tl-v"].value = TL.group(m[1]); const r1 = $('input[name="unit"][value="1"]', form); if (r1) r1.checked = true; }
    const run = (e) => {
      const p = TL.parseNum(val("tl-v"), mult(radio("unit")), true);
      if (!p.n) { fail(errMsg(p.why)); rows.innerHTML = ""; line.textContent = ""; echo.textContent = ""; return; }
      const V = p.n, cat = radio("buyer"), r = TL.cost(T, V, cat);
      okay();
      echo.textContent = TL.tpl(W.echo, { v: TL.both(V) });
      say.textContent = TL.tpl(W.say, { total: TL.both(r.total), share: r.share });
      band.innerHTML = "<p>" + E(TL.tpl(W.band, { as_read: T.as_read })) + "</p>";
      rows.innerHTML = r.lines.map((ln) => `<tr><td>${E(TL.tpl(W["row_" + ln.line + (ln.low ? "_low" : "")], { rate: TL.rateTxt(ln.rate) }))}</td>`
        + `<td>${TL.inr(ln.amount)}</td><td>${E(ln.notification)}, ${TL.dateTxt(ln.dated)}</td></tr>`).join("")
        + `<tr class="tl-tot"><td>${E(W.row_total)}</td><td>${TL.inr(r.total)}</td><td>${r.share} of the value</td></tr>`;
      line.textContent = TL.tpl(W.note_line, { value: TL.both(V), buyer: cats[cat].charAt(0).toLowerCase() + cats[cat].slice(1), total: TL.both(r.total), share: r.share, as_read: T.as_read, url: here() });
      if (e) tick(say);
    };
    form.addEventListener("input", run); form.addEventListener("change", run);
    run();
  }

  // ---------- tool 1b: comparable adjuster ----------
  if (C.tool === "adjuster") {
    const A = C.t, sqyd = C.u.sqyd, steps = $('[data-o="steps"]');
    const fill = () => {
      const use = radio("use"), unit = radio("per");
      ["from_size", "to_size"].forEach((n) => {
        const sel = form.elements[n], keep = sel.value;
        sel.innerHTML = A.bands[use].map((b) => `<option value="${E(b.label)}"${b.label === keep ? " selected" : ""}>${E(TL.sizeLabel(b, unit, sqyd) + (b.base ? " (" + W.base_tag + ")" : ""))}</option>`).join("");
      });
    };
    const run = (e) => {
      if (e && e.target && (e.target.name === "use" || e.target.name === "per")) fill();
      const p = TL.parseNum(val("tl-r"));
      if (!p.n) { fail(errMsg(p.why)); steps.innerHTML = ""; line.textContent = ""; return; }
      const use = radio("use"), unit = radio("per"), per = W[unit], useW = W["use_" + use].toLowerCase();
      const bF = val("from_size"), bT = val("to_size"), cF = radio("from_corner") === "1", cT = radio("to_corner") === "1";
      const bands = {}; A.bands[use].forEach((b) => { bands[b.label] = b; });
      const r = TL.adjust(A, p.n, use, bF, cF, bT, cT);
      const sz = (l) => TL.sizeLabel(bands[l], unit, sqyd), sqm = (l) => TL.sizeLabel(bands[l], "sqm", sqyd);
      const cw = (c) => (c ? W.corner_yes : "");
      okay();
      say.textContent = bF === bT && cF === cT ? TL.tpl(W.say_same, { rate: TL.inr(r.rate), per })
        : TL.tpl(W.say, { to_size: sz(bT), use: useW, to_corner: cw(cT), rate: TL.inr(r.rate), per });
      const base = A.bands[use].find((b) => b.base).label;
      const sure = (l) => {
        const b = bands[l];
        if (b.base || b.lo95 == null) return "";
        const o = { size: sqm(l), use: useW, base: sqm(base) };
        const t = b.hi95 < 0 ? TL.tpl(W.size_less, { ...o, a: Math.abs(b.hi95).toFixed(1) + "%", b: Math.abs(b.lo95).toFixed(1) + "%" })
          : b.lo95 > 0 ? TL.tpl(W.size_more, { ...o, a: b.lo95.toFixed(1) + "%", b: b.hi95.toFixed(1) + "%" })
          : TL.tpl(W.size_mixed, { ...o, a: Math.abs(b.lo95).toFixed(1) + "%", b: b.hi95.toFixed(1) + "%" });
        return `<p class="tl-sub"><b>${E(W.size_h)}.</b> ${E(t)}</p>`;
      };
      band.innerHTML = "<p>" + E(TL.tpl(W.band, { lo: TL.inr(r.lo), hi: TL.inr(r.hi), per })) + "</p>"
        + (bT !== bF ? sure(bT) + (bF !== bT ? sure(bF) : "") : "")
        + (cF || cT ? `<p class="tl-sub">${E(A.corner[use].holm ? W.corner_ok : W.corner_weak)}</p>` : "");
      let s = "";
      if (bF !== bT) s += `<tr><td>${E(TL.tpl(W.step_size, { from_size: sz(bF), to_size: sz(bT) }))}</td><td>${TL.signed((r.fs - 1) * 100)}</td></tr>`;
      if (cF !== cT) s += `<tr><td>${E(cT ? W.step_corner_on : W.step_corner_off)}</td><td>${TL.signed((r.fc - 1) * 100)}</td></tr>`;
      s += `<tr class="tl-tot"><td>${E(W.step_total)}</td><td>${TL.signed((r.fs * r.fc - 1) * 100)}</td></tr>`;
      steps.innerHTML = s;
      line.textContent = TL.tpl(W.note_line, { from_size: sz(bF), use: useW, from_corner: cw(cF), rate_in: TL.inr(p.n), per, rate: TL.inr(r.rate),
        to_size: sz(bT), to_corner: cw(cT), lo: TL.inr(r.lo), hi: TL.inr(r.hi), url: here() });
      if (e) tick(say);
    };
    form.addEventListener("input", run); form.addEventListener("change", run);
    run();
  }

  // ---------- tool 3: stamp-duty base ----------
  if (C.tool === "stamp-base") {
    const L = C.t, echo = $('[data-o="echo"]'), go = $('[data-o="go"]'), warn = $('[data-o="sqft_warn"]'), rl = $('[data-o="rate_label"]');
    const roadSet = $(".tl-road", form);
    const unitW = { sqm: W.sqm, sqft: W.sqft, sqyd: W.sqyd };
    const num = (n) => { const r = Math.round(n * 100) / 100; const [a, b] = r.toFixed(2).split("."); return TL.group(a) + (b === "00" ? "" : "." + b.replace(/0$/, "")); };
    const label = (id) => { const f = form.elements[id]; return f && f.labels && f.labels[0] ? f.labels[0].textContent.trim() + ": " : ""; };
    const run = (e) => {
      const use = radio("use"), side = radio("side"), road = radio("road"), ru = radio("rate_unit"), au = radio("area_unit");
      const ext = side === "exterior";
      roadSet.hidden = !ext;
      rl.textContent = ext ? TL.tpl(W.rate_label_ext, { base_road: C.base_road }) : W.rate_label_int;
      warn.hidden = ru !== "sqft";
      go.hidden = true;
      const pr = TL.parseNum(val("tl-rate")), pa = TL.parseNum(val("tl-area"));
      const pp = val("tl-price").trim() ? TL.parseNum(val("tl-price"), mult(radio("price_unit")), true) : { n: 0 };
      if (!pr.n) { fail(pr.why === "empty" ? W.err_rate_empty : errMsg(pr.why, label("tl-rate"))); line.textContent = ""; return; }
      if (!pa.n) { fail(pa.why === "empty" ? W.err_area_empty : errMsg(pa.why, label("tl-area"))); line.textContent = ""; return; }
      echo.textContent = pp.n ? TL.tpl(W.echo, { v: TL.both(pp.n) }) : "";
      if (pp.why) { fail(errMsg(pp.why, label("tl-price"))); line.textContent = ""; return; }
      const r = TL.stampBase(L, C.u, use, side, road, pr.n, ru, pa.n, au, pp.n);
      const per = unitW[ru];
      const areaR = ru === "sqft" ? r.areaM * C.u.sqft : r.areaM;
      const areaTxt = num(areaR) + " " + per + ((au === "sqyd" || ru === "sqft") && au !== ru ? " (" + num(pa.n) + " " + unitW[au] + ")" : "");
      const b = L.bands.find((x) => x.id === road), base = b.base;
      const mTxt = r.m.toFixed(2), roadW = TL.roadLabel(road), useW = W["use_" + use].toLowerCase();
      okay();
      const rateTxt = "₹" + num(pr.n);
      const first = !ext ? TL.tpl(W.say_int, { cv: TL.both(r.cv), rate: rateTxt, per, area: areaTxt })
        : base ? TL.tpl(W.say_ext_base, { cv: TL.both(r.cv), rate: rateTxt, per, area: areaTxt })
        : TL.tpl(W.say_ext, { cv: TL.both(r.cv), rate: rateTxt, per, m: mTxt, road: roadW, area: areaTxt });
      const second = r.cmp === "none" ? W.say_noprice : r.cmp === "price" ? TL.tpl(W.say_price_higher, { price: TL.both(pp.n) })
        : r.cmp === "cv" ? TL.tpl(W.say_cv_higher, { price: TL.both(pp.n), cv: TL.words(r.cv) }) : TL.tpl(W.say_equal, { cv: TL.words(r.cv) });
      say.textContent = first + " " + second;
      const shareKey = use === "commercial" ? b.share_com_key : b.share_res_key;
      band.innerHTML = "<p>" + E(!ext ? W.band_int : base ? TL.tpl(W.band_base, { base_road: C.base_road })
        : TL.tpl(W.band_step, { share: C.d[shareKey], use: useW, road: roadW, m: mTxt, base_road: C.base_road })) + "</p>";
      if (r.cmp !== "none") { go.hidden = false; go.textContent = TL.tpl(W.go, { v: TL.words(r.v) }); go.href = go.getAttribute("href").split("#")[0] + "#v=" + r.v; }
      line.textContent = TL.tpl(W.note_line, { cv: TL.both(r.cv), rate: rateTxt, per, step: ext && !base ? TL.tpl(W.note_step, { m: mTxt, road: roadW }) : "",
        area: areaTxt, price: pp.n ? TL.both(pp.n) : "not given", v: TL.both(r.v), url: here() });
      if (e) tick(say);
    };
    form.addEventListener("input", run); form.addEventListener("change", run);
    run();
  }

  // ---------- tool 5: offices (every figure is on the page already; this only shows one or two) ----------
  if (C.tool === "offices") {
    const cmp = $('[data-o="cmp"]');
    const run = (e) => {
      const a = val("a"), b = val("b") && val("b") !== a ? val("b") : "";
      $$(".tl-cell", cmp).forEach((c) => { const s = c.dataset.sro; c.hidden = s !== a && s !== b; c.style.order = s === a ? 0 : 1; });
      cmp.classList.toggle("tl-two", !!b);
      line.textContent = [a, b].filter(Boolean).map((s) => C.lines[s].replace("{url}", here())).join(" | ");
      if (e) tick(cmp);
    };
    form.addEventListener("change", run);
    run();
  }

  // ---------- tool 4: which price? ----------
  if (C.tool === "prices") {
    const panels = $$(".tl-panel");
    const show = () => {
      const w = radio("win");
      panels.forEach((p) => { const on = p.dataset.win === w; p.classList.toggle("on", on); if (on) requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add("go"))); else p.classList.remove("go"); });
      line.textContent = C.lines[w].replace("{url}", here());
    };
    form.addEventListener("change", show);
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); show(); } }, { rootMargin: "0px 0px -15% 0px" });
      io.observe($(".tl-work"));
      line.textContent = C.lines[radio("win")].replace("{url}", here());
    } else show();
    const chips = $$(".tl-q"), rowsQ = $$(".tl-qtbl tbody tr");
    chips.forEach((c) => c.addEventListener("click", () => {
      const on = c.getAttribute("aria-pressed") !== "true";
      chips.forEach((x) => x.setAttribute("aria-pressed", String(x === c && on)));
      rowsQ.forEach((r) => r.classList.toggle("tl-hit", on && r.dataset.q === c.dataset.q));
    }));
  }

  // ---------- tool 6: seasons ----------
  if (C.tool === "seasons") {
    const panels = $$(".tl-panel");
    const run = (e) => {
      const id = radio("where") + "-" + val("month");
      panels.forEach((p) => p.classList.toggle("on", p.dataset.p === id));
      line.textContent = C.lines[id].replace("{url}", here());
      if (e) tick($(".tl-panel.on"));
    };
    form.addEventListener("change", run);
    run();
  }
})();
