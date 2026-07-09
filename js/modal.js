/**
 * Telefon uyumlu modal (dialog yerine)
 */

const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  },

  close(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal-sheet.open')) {
      document.body.classList.remove('modal-open');
    }
  },

  closeAll() {
    document.querySelectorAll('.modal-sheet.open').forEach((el) => {
      el.classList.remove('open');
      el.setAttribute('aria-hidden', 'true');
    });
    document.body.classList.remove('modal-open');
  },

  bind(id) {
    const el = document.getElementById(id);
    if (!el) return;

    el.querySelector('.modal-close')?.addEventListener('click', () => this.close(id));
    el.addEventListener('click', (e) => {
      if (e.target === el) this.close(id);
    });
  }
};

const Toast = {
  show(message) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    navigator.vibrate?.(15);
    clearTimeout(this._timer);
    this._timer = setTimeout(() => el.classList.remove('show'), 2200);
  }
};
