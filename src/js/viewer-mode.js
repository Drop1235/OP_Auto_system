// viewer-mode.js
// Hide admin / edit UI when running in a pure browser (Netlify) environment.
if (!window.require) {
  window.addEventListener('DOMContentLoaded', () => {
    // Show screenshot container, hide main content
    const ss = document.getElementById('screenshot-container');
    if (ss) ss.style.display = 'block';
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.style.display = 'none';
    const adminIds = [
      'add-match-btn',
      'decrease-courts-btn',
      'increase-courts-btn',
      'board-export-btn',
      'board-export-type',
      'delete-all-matches-btn',
      'add-tournament-btn',
      'delete-tournament-btn',
      'logout-btn',
      'publish-btn',
      'board-view-btn',
      'history-view-btn',
      'tournament-modal',
    ];

    adminIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    // hide elements marked explicitly
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = 'none';
    });
  });
}
