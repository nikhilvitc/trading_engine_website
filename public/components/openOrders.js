function skeletonRow(cols) {
  return `<tr class="skeleton-row">${Array.from({ length: cols })
    .map(() => '<td><span class="skeleton-bar"></span></td>')
    .join('')}</tr>`;
}

function emptyRow(colspan, label) {
  return `<tr><td class="empty-cell" colspan="${colspan}">${label}</td></tr>`;
}

function orderRow(order) {
  return `
    <tr class="${order.type}-row">
      <td>${order.type}</td>
      <td>${Number(order.price).toFixed(2)}</td>
      <td>${order.remaining}</td>
      <td><button class="cancel-btn" data-order-id="${order.id}">Cancel</button></td>
    </tr>
  `;
}

export function createOpenOrdersTable({ body, onCancel }) {
  body.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-order-id]');

    if (!button) {
      return;
    }

    await onCancel(button.dataset.orderId);
  });

  function render({ orders = [], loading = false }) {
    if (loading) {
      body.innerHTML = skeletonRow(4) + skeletonRow(4) + skeletonRow(4);
      return;
    }

    body.innerHTML = orders.length
      ? orders.map(orderRow).join('')
      : emptyRow(4, 'No open orders yet');
  }

  return {
    render
  };
}
