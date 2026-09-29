/* Hailey Hunt — Analytics & Reports dashboard.
   Reads GoatCounter's public visitor counter (no API key needed); requires
   "Allow adding visitor counts on your website" in GoatCounter settings.
   GoatCounter counts unique visitors, and a range's end date is exclusive. */
(function () {
  "use strict";

  var code = window.GOATCOUNTER_CODE;
  var base = "https://" + code + ".goatcounter.com";
  var SVGNS = "http://www.w3.org/2000/svg";
  var DAY = 86400000;

  var PAGES = [
    { name: "Home",      paths: ["/", "/index.html"] },
    { name: "Portfolio", paths: ["/work.html"] },
    { name: "About",     paths: ["/about.html"] },
    { name: "Contact",   paths: ["/contact.html"] },
    { name: "Analytics & Reports", paths: ["/reports.html"] }
  ];
  var RANGES = {
    "7":   { label: "Last 7 days",    days: 7,  unit: "day" },
    "30":  { label: "Last 30 days",   days: 30, unit: "day" },
    "90":  { label: "Last 90 days",   days: 90, unit: "week" },
    "365": { label: "Last 12 months", unit: "month" }
  };
  var WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];
  var WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function $(id) { return document.getElementById(id); }
  var status = $("status"), select = $("range"), refresh = $("refresh"), tip = $("tip");

  /* ---- Mobile side menu ---------------------------------------------- */
  var menuBtn = document.querySelector(".dash-top__menu");
  var side = $("dash-side");
  function setMenu(open) {
    menuBtn.setAttribute("aria-expanded", String(open));
    side.classList.toggle("is-open", open);
  }
  menuBtn.addEventListener("click", function () { setMenu(!side.classList.contains("is-open")); });
  document.addEventListener("click", function (e) {
    if (!side.classList.contains("is-open")) return;
    if (e.target.closest("a") || (!side.contains(e.target) && !menuBtn.contains(e.target))) setMenu(false);
  });
  side.addEventListener("click", function (e) {
    var a = e.target.closest(".dash-side__sub[href^='#']");
    if (!a) return;
    side.querySelectorAll(".dash-side__sub").forEach(function (s) { s.removeAttribute("aria-current"); });
    a.setAttribute("aria-current", "page");
  });

  if (!code) {
    status.textContent = "Visitor counting isn't switched on yet. Add your GoatCounter site code to js/analytics.js.";
    return;
  }
  $("side-dashboard").href = base;
  $("link-report").href = base;

  /* ---- Dates ---------------------------------------------------------- */
  function midnight(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function iso(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function short(d) { return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  function monthYear(d) { return d.toLocaleDateString("en-US", { month: "short", year: "numeric" }); }
  function full(d) { return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

  function period(key) {
    var r = RANGES[key];
    var today = midnight(new Date());
    var end = addDays(today, 1);
    var start, buckets = [];

    if (r.unit === "month") {
      start = new Date(today.getFullYear(), today.getMonth() - 11, 1);
      for (var m = 0; m < 12; m++) {
        var from = new Date(start.getFullYear(), start.getMonth() + m, 1);
        var to = m === 11 ? end : new Date(start.getFullYear(), start.getMonth() + m + 1, 1);
        buckets.push({ from: from, to: to, tick: from.toLocaleDateString("en-US", { month: "short" }), name: monthYear(from) });
      }
    } else {
      start = addDays(today, -(r.days - 1));
      var step = r.unit === "week" ? 7 : 1;
      for (var d = start; d < end; d = addDays(d, step)) {
        var stop = addDays(d, step) < end ? addDays(d, step) : end;
        buckets.push({
          from: d, to: stop, tick: short(d),
          name: step === 1 ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
                           : "Week of " + short(d)
        });
      }
    }
    var days = Math.round((end - start) / DAY);
    return { key: key, unit: r.unit, start: start, end: end, days: days,
             prevStart: addDays(start, -days), buckets: buckets };
  }

  /* ---- Fetching (cached, max 6 at once) -------------------------------- */
  var cache = {}, queue = [], active = 0;
  function pump() {
    while (active < 6 && queue.length) {
      active++;
      queue.shift()().then(done, done);
    }
  }
  function done() { active--; pump(); }
  function limited(fn) {
    return new Promise(function (resolve, reject) {
      queue.push(function () { return fn().then(resolve, reject); });
      pump();
    });
  }

  // GoatCounter caches each start/end pair for hours and ignores other query
  // params. Nobody visits in the future, so a range that reaches today can end
  // on any later date with the same result: pick one that changes every minute.
  function freshEnd(to) {
    if (to <= midnight(new Date())) return to;
    return addDays(to, 1 + Math.floor(Date.now() / 60000) % 1000);
  }

  function count(path, from, to) {
    var url = base + "/counter/" + encodeURIComponent(path) + ".json?start=" + iso(from) + "&end=" + iso(freshEnd(to));
    if (!cache[url]) {
      cache[url] = limited(function () {
        return fetch(url).then(function (r) {
          if (r.status === 404) return 0;   // no visits to that page yet
          if (!r.ok) { var e = new Error("HTTP " + r.status); e.status = r.status; throw e; }
          return r.json().then(function (j) { return Number(String(j.count).replace(/\D/g, "")) || 0; });
        });
      });
      cache[url].catch(function () { delete cache[url]; });
    }
    return cache[url];
  }
  function sum(list) { return list.reduce(function (a, b) { return a + b; }, 0); }

  /* ---- Formatting ------------------------------------------------------ */
  function fmt(n) { return n.toLocaleString("en-US"); }
  function fmt1(n) { return n >= 10 || n === Math.round(n) ? fmt(Math.round(n)) : n.toFixed(1); }
  function plural(n) { return n === 1 ? "visitor" : "visitors"; }

  /* ---- Load ------------------------------------------------------------ */
  var current = null, token = 0;

  function load() {
    var p = period(select.value);
    var mine = ++token;

    Array.prototype.forEach.call(select.options, function (o) { o.textContent = RANGES[o.value].label; });
    var sel = select.options[select.selectedIndex];
    sel.textContent = RANGES[p.key].label + " (" + (p.unit === "month" ? monthYear(p.start) : short(p.start)) + " – Today)";
    $("compare").textContent = "compared to previous period (" + short(p.prevStart) + " – " + full(addDays(p.start, -1)) + ")";
    refresh.classList.add("is-busy");

    var daily = p.unit === "day" ? p : period("30");
    var jobs = [
      count("TOTAL", p.start, p.end),
      count("TOTAL", p.prevStart, p.start),
      Promise.all(p.buckets.map(function (b) { return count("TOTAL", b.from, b.to); })),
      Promise.all(PAGES.map(function (pg) {
        return Promise.all(pg.paths.map(function (path) { return count(path, p.start, p.end); })).then(sum);
      })),
      Promise.all(daily.buckets.map(function (b) { return count("TOTAL", b.from, b.to); }))
    ];

    Promise.all(jobs).then(function (res) {
      if (mine !== token) return;
      current = { p: p, total: res[0], prev: res[1], series: res[2], pages: res[3], daily: daily, dailyVals: res[4] };
      render();
      status.textContent = res[0] ? "" :
        "No visitors recorded in this period yet.";
    }).catch(function (err) {
      if (mine !== token) return;
      status.textContent = err.status === 403
        ? "GoatCounter is blocking the counts. In hhunt.goatcounter.com → Settings, turn on “Allow adding visitor counts on your website”."
        : "Couldn't reach GoatCounter right now. Try the refresh button in a minute.";
    }).then(function () {
      if (mine === token) refresh.classList.remove("is-busy");
    });
  }

  function render() {
    var c = current, p = c.p;

    // KPIs
    $("kpi-total").textContent = fmt(c.total);
    var delta = $("kpi-delta");
    delta.className = "kpi__delta";
    if (c.prev > 0) {
      var pct = Math.round((c.total - c.prev) / c.prev * 100);
      delta.textContent = pct === 0 ? "No change vs previous period"
        : (pct > 0 ? "▲ " : "▼ ") + Math.abs(pct) + "% vs previous period";
      if (pct) delta.classList.add(pct > 0 ? "is-up" : "is-down");
    } else {
      delta.textContent = c.total ? "None in previous period" : "";
    }
    $("kpi-avg").textContent = fmt1(sum(c.series) / p.days);

    var best = c.series.indexOf(Math.max.apply(null, c.series));
    $("kpi-best-label").textContent = "Busiest " + p.unit;
    if (c.series[best] > 0) {
      var b = p.buckets[best];
      $("kpi-best").textContent = p.unit === "month" ? b.tick : short(b.from);
      $("kpi-best-sub").textContent = fmt(c.series[best]) + " " + plural(c.series[best]);
    } else {
      $("kpi-best").textContent = "—";
      $("kpi-best-sub").textContent = "";
    }

    // Over time + its table
    lineChart($("chart-time"), p.buckets, c.series);
    var tbody = $("table-time");
    tbody.textContent = "";
    p.buckets.forEach(function (bk, i) {
      var tr = tbody.insertRow();
      tr.insertCell().textContent = bk.name;
      tr.insertCell().textContent = fmt(c.series[i]);
    });

    // Pages
    var list = $("page-bars");
    list.textContent = "";
    var top = Math.max.apply(null, c.pages);
    PAGES.map(function (pg, i) { return { name: pg.name, n: c.pages[i] }; })
      .sort(function (a, b) { return b.n - a.n; })
      .forEach(function (row) {
        var li = document.createElement("li");
        var head = document.createElement("div");
        head.className = "bars__row";
        var name = document.createElement("span");
        name.textContent = row.name;
        var val = document.createElement("b");
        val.textContent = fmt(row.n);
        head.append(name, val);
        var track = document.createElement("div");
        track.className = "bars__track";
        var fill = document.createElement("div");
        fill.className = "bars__fill";
        fill.style.width = (top ? row.n / top * 100 : 0) + "%";
        track.appendChild(fill);
        li.append(head, track);
        list.appendChild(li);
      });

    // Weekday averages
    var totals = [0, 0, 0, 0, 0, 0, 0], days = [0, 0, 0, 0, 0, 0, 0];
    c.daily.buckets.forEach(function (bk, i) {
      totals[bk.from.getDay()] += c.dailyVals[i];
      days[bk.from.getDay()] += 1;
    });
    var avgs = WEEKDAYS.map(function (wd) { return days[wd] ? totals[wd] / days[wd] : 0; });
    $("weekday-note").textContent = "Based on the " + (c.daily.days === 7 ? "last 7 days" : "last 30 days");
    columnChart($("chart-weekday"), WEEKDAYS.map(function (wd) { return WEEKDAY_NAMES[wd]; }), avgs);
  }

  /* ---- Chart helpers --------------------------------------------------- */
  function el(name, attrs, parent) {
    var n = document.createElementNS(SVGNS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function scale(max, whole) {
    if (!(max > 0)) max = 1;
    var raw = max / 4;
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var step = [1, 2, 5, 10].map(function (m) { return m * mag; }).filter(function (s) { return s >= raw; })[0];
    if (whole) step = Math.max(1, Math.round(step));
    var top = Math.ceil(max / step - 1e-9) * step;
    var ticks = [];
    for (var t = 0; t <= top + 1e-9; t += step) ticks.push(+t.toFixed(4));
    return { top: top, ticks: ticks, label: function (v) { return step < 1 ? v.toFixed(step < 0.1 ? 2 : 1) : fmt(v); } };
  }

  function showTip(value, label, x, y) {
    tip.innerHTML = "";
    var b = document.createElement("b");
    b.textContent = value;
    var s = document.createElement("span");
    s.textContent = label;
    tip.append(b, s);
    tip.hidden = false;
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var left = Math.min(Math.max(8, x - w / 2), window.innerWidth - w - 8);
    var topPos = y - h - 12 < 8 ? y + 16 : y - h - 12;
    tip.style.left = left + "px";
    tip.style.top = topPos + "px";
  }
  function hideTip() { tip.hidden = true; }

  function lineChart(box, buckets, values) {
    box.textContent = "";
    var W = box.clientWidth, H = box.clientHeight;
    var m = { l: 40, r: 14, t: 10, b: 30 };
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    var sc = scale(Math.max.apply(null, values), true);
    var n = values.length;
    function x(i) { return m.l + (n === 1 ? pw / 2 : i * pw / (n - 1)); }
    function y(v) { return m.t + ph - v / sc.top * ph; }

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img",
      "aria-label": "Visitors over time, " + buckets[0].name + " to " + buckets[n - 1].name + ". Values are in the table below." }, box);

    var grid = el("g", { class: "grid" }, svg), axis = el("g", { class: "axis" }, svg);
    sc.ticks.forEach(function (t) {
      el("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t) }, grid);
      el("text", { x: m.l - 10, y: y(t) + 4, "text-anchor": "end" }, axis).textContent = sc.label(t);
    });
    var every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(pw / 72))));
    for (var i = 0; i < n; i += every) {
      el("text", { x: x(i), y: H - 8, "text-anchor": n === 1 ? "middle" : i === 0 ? "start" : "middle" }, axis).textContent = buckets[i].tick;
    }

    var pts = values.map(function (v, i) { return x(i).toFixed(1) + "," + y(v).toFixed(1); });
    if (n > 1) {
      el("path", { class: "area", d: "M" + x(0) + "," + y(0) + "L" + pts.join("L") + "L" + x(n - 1) + "," + y(0) + "Z" }, svg);
      el("path", { class: "line", d: "M" + pts.join("L") }, svg);
    }

    var cross = el("line", { class: "cross", y1: m.t, y2: m.t + ph, visibility: "hidden" }, svg);
    var dot = el("circle", { class: "dot", r: 5, visibility: n > 1 ? "hidden" : "visible", cx: x(0), cy: y(values[0]) }, svg);
    var hit = el("rect", { x: m.l, y: m.t, width: pw, height: ph, fill: "transparent" }, svg);

    var at = -1;
    function focusOn(i) {
      at = i;
      cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i));
      dot.setAttribute("cx", x(i)); dot.setAttribute("cy", y(values[i]));
      cross.setAttribute("visibility", "visible"); dot.setAttribute("visibility", "visible");
      var r = svg.getBoundingClientRect();
      showTip(fmt(values[i]) + " " + plural(values[i]), buckets[i].name, r.left + x(i) * r.width / W, r.top + y(values[i]) * r.height / H);
    }
    function clear() {
      at = -1; hideTip();
      cross.setAttribute("visibility", "hidden");
      if (n > 1) dot.setAttribute("visibility", "hidden");
    }
    hit.addEventListener("pointermove", function (e) {
      var r = svg.getBoundingClientRect();
      var px = (e.clientX - r.left) * W / r.width;
      focusOn(n === 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round((px - m.l) / pw * (n - 1)))));
    });
    hit.addEventListener("pointerleave", clear);

    box.tabIndex = 0;
    box.onkeydown = function (e) {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        focusOn(Math.max(0, Math.min(n - 1, (at < 0 ? n - 1 : at) + (e.key === "ArrowRight" ? 1 : -1))));
      } else if (e.key === "Escape") clear();
    };
    box.onfocus = function () { focusOn(n - 1); };
    box.onblur = clear;
  }

  function columnChart(box, labels, values) {
    box.textContent = "";
    var W = box.clientWidth, H = box.clientHeight;
    var m = { l: 34, r: 6, t: 20, b: 26 };
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    var sc = scale(Math.max.apply(null, values), false);
    var slot = pw / values.length, bw = Math.min(24, slot * 0.6);
    function y(v) { return m.t + ph - v / sc.top * ph; }

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H }, box);
    var grid = el("g", { class: "grid" }, svg), axis = el("g", { class: "axis" }, svg);
    sc.ticks.forEach(function (t) {
      el("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t) }, grid);
      el("text", { x: m.l - 8, y: y(t) + 4, "text-anchor": "end" }, axis).textContent = sc.label(t);
    });

    var peak = values.indexOf(Math.max.apply(null, values));
    values.forEach(function (v, i) {
      var cx = m.l + slot * i + slot / 2, x0 = cx - bw / 2, top = y(v), bottom = y(0);
      el("text", { x: cx, y: H - 6, "text-anchor": "middle" }, axis).textContent = labels[i];
      var hit = el("rect", { class: "col-hit", x: m.l + slot * i, y: m.t, width: slot, height: ph, tabindex: 0,
        role: "img", "aria-label": labels[i] + ": " + fmt1(v) + " visitors on average" }, svg);
      if (v > 0) {
        var r = Math.min(4, bottom - top);
        el("path", { class: "col", d: "M" + x0 + "," + bottom + "V" + (top + r) + "Q" + x0 + "," + top + " " + (x0 + r) + "," + top +
          "H" + (x0 + bw - r) + "Q" + (x0 + bw) + "," + top + " " + (x0 + bw) + "," + (top + r) + "V" + bottom + "Z" }, svg);
        if (i === peak) el("text", { class: "peak", x: cx, y: top - 6, "text-anchor": "middle" }, svg).textContent = fmt1(v);
      } else {
        el("path", { class: "col" }, svg);   // keeps hit + col pairing for the hover style
      }
      function show() {
        var rc = svg.getBoundingClientRect();
        showTip(fmt1(v) + " " + plural(v) + " on average", labels[i], rc.left + cx * rc.width / W, rc.top + top * rc.height / H);
      }
      hit.addEventListener("pointerenter", show);
      hit.addEventListener("focus", show);
      hit.addEventListener("pointerleave", hideTip);
      hit.addEventListener("blur", hideTip);
    });
  }

  /* ---- Wire up --------------------------------------------------------- */
  select.addEventListener("change", load);
  refresh.addEventListener("click", function () { cache = {}; load(); });
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (current) render(); }, 150);
  });
  window.addEventListener("scroll", hideTip, { passive: true });

  load();
})();
