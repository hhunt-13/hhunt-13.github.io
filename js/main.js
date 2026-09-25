/* Hailey Hunt — site interactions. No dependencies. */
(function () {
  "use strict";

  /* ---- Mobile nav ----------------------------------------------------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("primary-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
      }
    });
  }

  /* ---- Header hairline on scroll -------------------------------------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-stuck", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- Reveal on scroll ----------------------------------------------- */
  var revealables = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  if (revealables.length) {
    var reveal = function (el) { el.classList.add("is-in"); };

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            reveal(entry.target);
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
      revealables.forEach(function (el) { io.observe(el); });
    }

    // Belt and braces. The observer can be throttled, absent, or simply never
    // fire, and scroll events are not guaranteed either (programmatic scrolls
    // don't always emit one). Polling is the only thing that always works, so
    // a section can never be left permanently invisible. It stops itself as
    // soon as everything is shown.
    var pending = revealables.slice();
    var sweep = function () {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      pending = pending.filter(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) { reveal(el); return false; }
        return true;
      });
      if (!pending.length && timer) { clearInterval(timer); timer = null; }
    };
    var timer = setInterval(sweep, 200);
    sweep();
    window.addEventListener("scroll", sweep, { passive: true });
    window.addEventListener("resize", sweep);
  }

  /* ---- Gallery filters ------------------------------------------------ */
  var filterBar = document.querySelector(".filters");
  if (filterBar) {
    filterBar.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-filter]");
      if (!btn) return;
      var want = btn.dataset.filter;

      filterBar.querySelectorAll("button").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b === btn));
      });
      document.querySelectorAll(".shot").forEach(function (shot) {
        var match = want === "all" || shot.dataset.category === want;
        shot.classList.toggle("is-hidden", !match);
      });
    });
  }

  /* ---- Lightbox ------------------------------------------------------- */
  var box = document.querySelector(".lightbox");
  if (!box) return;

  var boxImg     = box.querySelector("img");
  var boxCaption = box.querySelector(".lightbox__caption");
  var btnClose   = box.querySelector(".lightbox__close");
  var btnPrev    = box.querySelector(".lightbox__prev");
  var btnNext    = box.querySelector(".lightbox__next");
  var lastFocus  = null;
  var index      = 0;

  function visibleShots() {
    return Array.prototype.filter.call(
      document.querySelectorAll(".shot"),
      function (s) { return !s.classList.contains("is-hidden"); }
    );
  }

  function show(i) {
    var shots = visibleShots();
    if (!shots.length) return;
    index = (i + shots.length) % shots.length;
    var shot = shots[index];
    boxImg.src = shot.dataset.full;
    boxImg.alt = shot.querySelector("img").alt;
    boxCaption.textContent = shot.dataset.caption || "";
    var multiple = shots.length > 1;
    btnPrev.hidden = !multiple;
    btnNext.hidden = !multiple;
  }

  function open(i) {
    lastFocus = document.activeElement;
    show(i);
    box.classList.add("is-open");
    box.removeAttribute("aria-hidden");
    document.body.classList.add("no-scroll");
    btnClose.focus();
  }

  function close() {
    box.classList.remove("is-open");
    box.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    boxImg.removeAttribute("src");
    if (lastFocus) lastFocus.focus();
  }

  document.addEventListener("click", function (e) {
    var shot = e.target.closest(".shot");
    if (!shot) return;
    open(visibleShots().indexOf(shot));
  });

  btnClose.addEventListener("click", close);
  btnPrev.addEventListener("click", function () { show(index - 1); });
  btnNext.addEventListener("click", function () { show(index + 1); });
  box.addEventListener("click", function (e) {
    if (e.target === box) close();
  });

  document.addEventListener("keydown", function (e) {
    if (!box.classList.contains("is-open")) return;
    if (e.key === "Escape")     { close(); }
    if (e.key === "ArrowLeft")  { show(index - 1); }
    if (e.key === "ArrowRight") { show(index + 1); }
    if (e.key === "Tab") {
      // Keep focus inside the dialog.
      var focusable = Array.prototype.filter.call(
        box.querySelectorAll("button"),
        function (b) { return !b.hidden; }
      );
      var first = focusable[0];
      var last  = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
})();
