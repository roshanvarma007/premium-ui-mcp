// Applies the theme after the page has loaded: users see a flash of the light theme.
window.addEventListener('load', () => {
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
  }
});
