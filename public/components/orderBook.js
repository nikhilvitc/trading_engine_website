function skeletonRow(cols) {
  return `<tr class="skeleton-row">${Array.from({ length: cols })
    .map(() => '<td><span class="skeleton-bar"></span></td>')
    .join('')}</tr>`;
}

function emptyRow(colspan, label) {
  return `<tr><td class="empty-cell" colspan="${colspan}">${label}</td></tr>`;
}

function orderRow(order, tone) {
  return `
    <tr class="${tone}-row">
      <td>${Number(order.price).toFixed(2)}</td>
      <td>${order.remaining}</td>
      <td>${order.status}</td>
    </tr>
  `;
}

export function createOrderBook({ buyBody, sellBody }) {
  function render({ buy = [], sell = [], loading = false }) {
    if (loading) {
      buyBody.innerHTML = skeletonRow(3) + skeletonRow(3) + skeletonRow(3);
      sellBody.innerHTML = skeletonRow(3) + skeletonRow(3) + skeletonRow(3);
      return;
    }

    buyBody.innerHTML = buy.length
      ? buy.map((order) => orderRow(order, 'buy')).join('')
      : emptyRow(3, 'No orders yet');

    sellBody.innerHTML = sell.length
      ? sell.map((order) => orderRow(order, 'sell')).join('')
      : emptyRow(3, 'No orders yet');
  }

  return {
    render
  };
}
