export function createToastManager(root) {
  let toastId = 0;

  function show(message, variant = 'info', duration = 2600) {
    const node = document.createElement('div');
    node.className = `toast toast-${variant}`;
    node.dataset.toastId = String(++toastId);
    node.textContent = message;

    root.appendChild(node);

    window.setTimeout(() => {
      node.classList.add('toast-hide');
      window.setTimeout(() => {
        node.remove();
      }, 180);
    }, duration);
  }

  return {
    show
  };
}
