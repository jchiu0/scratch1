(function bootstrapTheme() {
  var STORAGE_KEY = 'todo-app:v1';
  var preference = 'system';
  try {
    var raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      var theme = parsed && parsed.settings && parsed.settings.theme;
      if (theme === 'light' || theme === 'dark' || theme === 'system') {
        preference = theme;
      }
    }
  } catch (error) {
    preference = 'system';
  }

  var systemDark = false;
  try {
    systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch (error) {
    systemDark = false;
  }

  var resolved =
    preference === 'light' || preference === 'dark'
      ? preference
      : systemDark
        ? 'dark'
        : 'light';

  var root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-theme-preference', preference);
  root.style.colorScheme = resolved;
})();
