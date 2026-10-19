/* Day and night. Default follows the system; the button sets and remembers a choice. */
(function () {
  var root = document.documentElement;
  var btn = document.querySelector('.theme');
  var mq = window.matchMedia('(prefers-color-scheme: dark)');

  function isDark() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : mq.matches;
  }
  function paint() {
    if (!btn) return;
    var dark = isDark();
    btn.setAttribute('aria-pressed', String(dark));
    btn.querySelector('span').textContent = dark ? 'Day' : 'Night';
  }
  function changed() {
    paint();
    document.dispatchEvent(new Event('themechange'));
  }

  if (btn) {
    btn.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      changed();
    });
  }
  if (mq.addEventListener) mq.addEventListener('change', changed);
  paint();
})();
