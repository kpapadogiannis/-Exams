// Κεντρικός Διαχειριστής Πλοήγησης (Sidebar Routing) & Διαδραστικών Στοιχείων (Accordions)

document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('main-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const openBtn = document.getElementById('sidebar-open-btn');
  const closeBtn = document.getElementById('sidebar-close-btn');
  const sidebarNavItems = document.querySelectorAll('#main-sidebar .sidebar-nav-item');
  const views = document.querySelectorAll('.portal-view');
  const savedBadge = document.getElementById('sidebar-saved-badge');

  function updateSidebarSavedCount() {
    try {
      const stored = localStorage.getItem('speedboat_saved_questions');
      const count = stored ? JSON.parse(stored).length : 0;
      if (savedBadge) savedBadge.textContent = count;
    } catch(e) {}
  }

  function switchView(targetViewId) {
    if (targetViewId === 'view-saved-test') {
      views.forEach(v => v.classList.add('hidden'));
      const quizView = document.getElementById('view-quiz');
      if (quizView) quizView.classList.remove('hidden');
      if (window.quizApp) window.quizApp.startQuiz('saved');
    } else if (targetViewId === 'view-stats') {
      views.forEach(v => v.classList.add('hidden'));
      const statsView = document.getElementById('view-stats');
      if (statsView) statsView.classList.remove('hidden');
      if (window.quizApp) window.quizApp.renderStats();
    } else {
      views.forEach(v => v.classList.add('hidden'));
      const target = document.getElementById(targetViewId);
      if (target) target.classList.remove('hidden');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    sidebarNavItems.forEach(link => {
      const target = link.getAttribute('data-sidebar-target');
      if (target === targetViewId) {
        link.className = "sidebar-nav-item w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all bg-sky-600 text-white shadow-md font-bold";
      } else {
        link.className = "sidebar-nav-item w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all text-slate-300 hover:text-white hover:bg-slate-800/70 font-semibold";
      }
    });

    if (sidebar) sidebar.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');

    updateSidebarSavedCount();
  }

  // Global router access
  window.switchView = switchView;
  window.updateSidebarSavedCount = updateSidebarSavedCount;

  // Bind click navigation for all elements with data-sidebar-target
  document.querySelectorAll('[data-sidebar-target]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('data-sidebar-target');
      switchView(target);
    });
  });

  // Mobile sidebar controls
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      if (sidebar) sidebar.classList.remove('-translate-x-full');
      if (backdrop) backdrop.classList.remove('hidden');
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (sidebar) sidebar.classList.add('-translate-x-full');
      if (backdrop) backdrop.classList.add('hidden');
    });
  }
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      if (sidebar) sidebar.classList.add('-translate-x-full');
      backdrop.classList.add('hidden');
    });
  }

  // Accordion toggles
  document.querySelectorAll('.accordion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const content = btn.nextElementSibling;
      const icon = btn.querySelector('.accordion-icon');
      const isExpanded = !content.classList.contains('hidden');

      if (isExpanded) {
        content.classList.add('hidden');
        btn.classList.remove('bg-sky-50/70', 'border-sky-300');
        if (icon) icon.textContent = '▼';
      } else {
        content.classList.remove('hidden');
        btn.classList.add('bg-sky-50/70', 'border-sky-300');
        if (icon) icon.textContent = '▲';
      }
    });
  });

  // Toggle all accordions in section
  document.querySelectorAll('.btn-toggle-all-accordions').forEach(toggleBtn => {
    toggleBtn.addEventListener('click', () => {
      const section = toggleBtn.closest('.portal-view');
      if (!section) return;

      const items = section.querySelectorAll('.accordion-content');
      const allOpen = Array.from(items).every(it => !it.classList.contains('hidden'));

      items.forEach(item => {
        const btn = item.previousElementSibling;
        const icon = btn ? btn.querySelector('.accordion-icon') : null;

        if (allOpen) {
          item.classList.add('hidden');
          if (btn) btn.classList.remove('bg-sky-50/70', 'border-sky-300');
          if (icon) icon.textContent = '▼';
        } else {
          item.classList.remove('hidden');
          if (btn) btn.classList.add('bg-sky-50/70', 'border-sky-300');
          if (icon) icon.textContent = '▲';
        }
      });

      toggleBtn.textContent = allOpen ? " Άνοιγμα Όλων" : " Κλείσιμο Όλων";
    });
  });

  updateSidebarSavedCount();
});
