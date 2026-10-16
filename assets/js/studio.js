(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const command = document.querySelector('[data-command-dialog]');
  if (command) {
    const query = command.querySelector('input');
    const items = [...command.querySelectorAll('[data-command-item]')];
    let previousFocus;
    const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
    const filter = () => {
      const words = normalize(query.value).trim().split(/\s+/).filter(Boolean);
      items.forEach(item => { item.hidden = !words.every(word => normalize(item.dataset.commandKey).includes(word)); });
      const visible = items.filter(item => !item.hidden);
      command.querySelector('[data-command-empty]').hidden = visible.length > 0;
      command.querySelector('[data-command-count]').textContent = `${visible.length} results`;
      command.querySelectorAll('.studio-command-group').forEach(heading => {
        let sibling = heading.nextElementSibling, anyVisible = false;
        while (sibling && !sibling.classList.contains('studio-command-group')) {
          if (sibling.matches('[data-command-item]') && !sibling.hidden) anyVisible = true;
          sibling = sibling.nextElementSibling;
        }
        heading.hidden = !anyVisible;
      });
    };
    const open = () => {
      if (command.open) return;
      previousFocus = document.activeElement;
      query.value = ''; filter(); command.showModal(); query.focus();
    };
    const close = () => command.close();
    document.querySelectorAll('[data-command-open]').forEach(button => button.addEventListener('click', open));
    command.querySelector('[data-command-close]').addEventListener('click', close);
    command.addEventListener('close', () => previousFocus?.focus());
    command.addEventListener('click', event => {
      const box = command.getBoundingClientRect();
      if (event.target === command && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) close();
      if (event.target.closest('a')) close();
    });
    query.addEventListener('input', filter);
    command.addEventListener('keydown', event => {
      const visible = items.filter(item => !item.hidden);
      const current = visible.indexOf(document.activeElement);
      if (['ArrowDown', 'ArrowUp'].includes(event.key) && visible.length) {
        event.preventDefault();
        const next = current < 0 ? (event.key === 'ArrowDown' ? 0 : visible.length - 1) : (current + (event.key === 'ArrowDown' ? 1 : -1) + visible.length) % visible.length;
        visible[next].focus();
      }
      if (event.key === 'Enter' && document.activeElement === query && visible.length) { event.preventDefault(); visible[0].click(); }
    });
    document.addEventListener('keydown', event => {
      const editing = event.target.closest('input, textarea, select, [contenteditable="true"]');
      if (((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') || (event.key === '/' && !editing)) {
        event.preventDefault(); command.open ? close() : open();
      }
    });
    if (!/Mac|iPhone|iPad/.test(navigator.platform)) document.querySelector('[data-command-shortcut]').textContent = 'Ctrl K';
  }
  document.querySelectorAll('[data-copy-email]').forEach(button => {
    let reset;
    button.addEventListener('click', async () => {
      const label = button.querySelector('[data-copy-label]');
      const status = document.querySelector('[data-copy-status]');
      try {
        await navigator.clipboard.writeText(button.dataset.copyEmail);
        label.textContent = 'Copied';
        status.textContent = 'Email address copied to clipboard.';
        clearTimeout(reset);
        reset = setTimeout(() => { label.textContent = 'Copy email'; status.textContent = ''; }, 2200);
      } catch {
        label.textContent = button.dataset.copyEmail;
        status.textContent = `Email address: ${button.dataset.copyEmail}`;
      }
    });
  });

  const menu = document.querySelector('.studio-more');
  if (menu) {
    document.addEventListener('click', event => {
      if (!menu.contains(event.target)) menu.open = false;
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.open) {
        menu.open = false;
        menu.querySelector('summary').focus();
      }
    });
  }

  const progress = document.querySelector('.studio-reading-progress > span');
  if (progress) {
    let scheduled = false;
    const updateProgress = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = height > 0 ? Math.min(1, Math.max(0, window.scrollY / height)) : 0;
      progress.style.transform = `scaleX(${ratio})`;
      scheduled = false;
    };
    window.addEventListener('scroll', () => {
      if (!scheduled) { scheduled = true; requestAnimationFrame(updateProgress); }
    }, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();
  }

  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const candidates = document.querySelectorAll('.studio-research, .studio-publications, .studio-talks, .studio-game, .studio-event, .studio-post-list > article');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('studio-reveal-pending');
        observer.unobserve(entry.target);
      }
    }), { threshold: .06 });
    candidates.forEach(element => {
      if (element.getBoundingClientRect().top > window.innerHeight) {
        element.classList.add('studio-reveal-pending');
        observer.observe(element);
      }
    });
    reducedMotion.addEventListener('change', event => {
      if (event.matches) {
        candidates.forEach(element => element.classList.remove('studio-reveal-pending'));
        observer.disconnect();
      }
    });
  }

  const gameCollection = document.querySelector('[data-game-collection]');
  if (gameCollection) {
    const buttons = [...gameCollection.querySelectorAll('[data-game-filter]')];
    const games = [...gameCollection.querySelectorAll('[data-game-status]')];
    buttons.forEach(button => button.addEventListener('click', () => {
      const filter = button.dataset.gameFilter;
      buttons.forEach(peer => peer.setAttribute('aria-pressed', String(peer === button)));
      let count = 0;
      games.forEach(game => {
        game.hidden = filter !== 'all' && game.dataset.gameStatus !== filter;
        if (!game.hidden) { count++; game.classList.remove('studio-reveal-pending'); }
      });
      gameCollection.querySelector('[data-game-count]').textContent = `${count} ${count === 1 ? 'game' : 'games'}`;
    }));
  }

})();
