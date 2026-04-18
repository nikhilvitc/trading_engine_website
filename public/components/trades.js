function skeletonRow(cols) {
  return `<tr class="skeleton-row">${Array.from({ length: cols })
    .map(() => '<td><span class="skeleton-bar"></span></td>')
    .join('')}</tr>`;
}

function emptyRow(colspan, label) {
  return `<tr><td class="empty-cell" colspan="${colspan}">${label}</td></tr>`;
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(timestamp));
}

export function createTradesTable({ body }) {
  function render({ trades = [], loading = false }) {
    if (loading) {
      body.innerHTML = skeletonRow(4) + skeletonRow(4) + skeletonRow(4);
      return;
    }

    body.innerHTML = trades.length
      ? trades.map((trade) => `
          <tr>
            <td>${Number(trade.price).toFixed(2)}</td>
            <td>${trade.quantity}</td>
            <td>${formatTime(trade.timestamp)}</td>
            <td>${trade.id.slice(0, 8)}</td>
          </tr>
        `).join('')
      : emptyRow(4, 'No trades yet');
  }

  return {
    render
  };
}
