window.disableNavScroll = true;
toggleNavbar(true);

function filterTab(name) {
    currentFilter = name;
    ['all','unread','appointments','system'].forEach(t => {
      const btn = document.getElementById('ftab-' + t);
      if (t === name) {
        btn.classList.remove('text-muted','border-transparent');
        btn.classList.add('text-primary','border-primary');
      } else {
        btn.classList.remove('text-primary','border-primary');
        btn.classList.add('text-muted','border-transparent');
      }
    });
    applyFilter();
  }