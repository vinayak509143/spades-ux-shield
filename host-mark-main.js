/**
 * MAIN world — stamp only. Must stay MAIN so page JS cannot wrap our isolated
 * world, and so data-op lands before author CSS. Procedural engine / :uncheck
 * live in boot.js (ISOLATED), not here.
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
