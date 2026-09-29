/* Hailey Hunt — visitor counting via GoatCounter (no cookies, no banner). */

/* Your GoatCounter site code: the "yourname" in yourname.goatcounter.com.
   Until this is filled in, nothing is counted and the reports page says so. */
window.GOATCOUNTER_CODE = "hhunt";

(function () {
  "use strict";

  var code = window.GOATCOUNTER_CODE;
  if (!code) return;

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://gc.zgo.at/count.js";
  s.setAttribute("data-goatcounter", "https://" + code + ".goatcounter.com/count");
  document.head.appendChild(s);
})();
