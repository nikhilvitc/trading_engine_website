export function createOrderForm({
  formRoot,
  buyTab,
  sellTab,
  typeSelect,
  priceInput,
  quantityInput,
  submitButton
}) {
  function setSide(side) {
    typeSelect.value = side;
    const isBuy = side === 'buy';

    buyTab.classList.toggle('active', isBuy);
    sellTab.classList.toggle('active', !isBuy);
    submitButton.classList.toggle('buy-mode', isBuy);
    submitButton.classList.toggle('sell-mode', !isBuy);
    submitButton.textContent = isBuy ? 'LAUNCH BUY ORDER' : 'LAUNCH SELL ORDER';
  }

  function setLoading(isLoading) {
    submitButton.disabled = isLoading;
    submitButton.dataset.loading = String(isLoading);
    submitButton.textContent = isLoading ? 'PROCESSING...' : typeSelect.value === 'buy' ? 'LAUNCH BUY ORDER' : 'LAUNCH SELL ORDER';
  }

  function getValues() {
    return {
      pair: null,
      type: typeSelect.value,
      price: Number(priceInput.value),
      quantity: Number(quantityInput.value)
    };
  }

  function reset() {
    priceInput.value = '';
    quantityInput.value = '';
    setSide(typeSelect.value);
  }

  buyTab.addEventListener('click', () => setSide('buy'));
  sellTab.addEventListener('click', () => setSide('sell'));
  typeSelect.addEventListener('change', () => setSide(typeSelect.value));

  setSide(typeSelect.value || 'buy');

  return {
    setSide,
    setLoading,
    getValues,
    reset,
    formRoot
  };
}
