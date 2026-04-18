const SUPPORTED_PAIRS = ['BTC/USD', 'KGEN/USDT'];

if (SUPPORTED_PAIRS.length !== 2) {
  throw new Error('Exactly two currency pairs must be configured');
}

module.exports = {
  SUPPORTED_PAIRS
};