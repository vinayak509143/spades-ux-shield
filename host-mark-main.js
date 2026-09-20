"use strict";
(() => {
  // src/engine/amazon-retail.ts
  var AMAZON_RETAIL_APEX = /* @__PURE__ */ new Set([
    "amazon.com",
    "amazon.ca",
    "amazon.com.mx",
    "amazon.com.br",
    "amazon.co.uk",
    "amazon.de",
    "amazon.fr",
    "amazon.it",
    "amazon.es",
    "amazon.nl",
    "amazon.se",
    "amazon.pl",
    "amazon.com.be",
    "amazon.ie",
    "amazon.com.tr",
    "amazon.eg",
    "amazon.sa",
    "amazon.ae",
    "amazon.co.za",
    "amazon.in",
    "amazon.co.jp",
    "amazon.sg",
    "amazon.com.au"
  ]);
  var AMAZON_EN_APEX = /* @__PURE__ */ new Set([
    "amazon.com",
    "amazon.ca",
    "amazon.co.uk",
    "amazon.in",
    "amazon.com.au",
    "amazon.sg",
    "amazon.ie",
    "amazon.co.za"
  ]);
  function normalizeHostname(hostname) {
    return hostname.trim().toLowerCase();
  }
  function apexFromHostname(hostname) {
    const host = normalizeHostname(hostname);
    if (!host) {
      return null;
    }
    if (AMAZON_RETAIL_APEX.has(host)) {
      return host;
    }
    if (host.startsWith("www.")) {
      const apex = host.slice(4);
      if (AMAZON_RETAIL_APEX.has(apex)) {
        return apex;
      }
    }
    return null;
  }
  function isAmazonRetailHost(hostname) {
    return apexFromHostname(hostname) !== null;
  }
  function isAmazonEnHost(hostname) {
    const apex = apexFromHostname(hostname);
    return apex !== null && AMAZON_EN_APEX.has(apex);
  }

  // src/engine/util.ts
  function hostSuffixes(hostname) {
    const labels = hostname.toLowerCase().split(".").filter(Boolean);
    const out = [];
    for (let i = 0; i < labels.length; i++) {
      out.push(labels.slice(i).join("."));
    }
    return out;
  }

  // src/content/host-mark.ts
  function hostMarkValue(hostname) {
    return hostSuffixes(hostname).join(" ");
  }
  function applyAmazonRetailMarks(html, hostname) {
    if (isAmazonRetailHost(hostname)) {
      html.setAttribute("data-op-amz", "1");
    } else {
      html.removeAttribute("data-op-amz");
    }
    if (isAmazonEnHost(hostname)) {
      html.setAttribute("data-op-amz-en", "1");
    } else {
      html.removeAttribute("data-op-amz-en");
    }
  }
  function applyHostMark() {
    const html = document.documentElement;
    const hostname = location.hostname;
    html.setAttribute("data-op-h", hostMarkValue(hostname));
    html.setAttribute("data-op", "1");
    applyAmazonRetailMarks(html, hostname);
  }
  function ensureHostMark() {
    const html = document.documentElement;
    if (html.getAttribute("data-op") !== "1") {
      return;
    }
    const hostname = location.hostname;
    const suffixes = hostMarkValue(hostname);
    if (html.getAttribute("data-op-h") !== suffixes) {
      html.setAttribute("data-op-h", suffixes);
    }
    applyAmazonRetailMarks(html, hostname);
  }

  // src/content/host-mark-main-entry.ts
  applyHostMark();
  window.addEventListener("pageshow", () => {
    ensureHostMark();
  });
})();
