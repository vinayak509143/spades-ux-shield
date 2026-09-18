/**
 * MAIN world — runs before extension CSS (separate manifest entry).
 * Sets kill-switch + host gate synchronously (no imports, minimal parse).
 */
(function markHost() {
  var labels = location.hostname.toLowerCase().split('.').filter(Boolean);
  var suffixes = [];
  for (var i = 0; i < labels.length; i++) {
    suffixes.push(labels.slice(i).join('.'));
  }
  var root = document.documentElement;
  root.setAttribute('data-op', '1');
  root.setAttribute('data-op-h', suffixes.join(' '));
})();
