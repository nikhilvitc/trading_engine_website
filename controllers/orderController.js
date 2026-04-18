const orderBookService = require('../services/orderBookService');

function parsePositiveNumber(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function validateOrderInput(body) {
  const { pair, type, price, quantity } = body;

  if (typeof pair !== 'string' || !orderBookService.isSupportedPair(pair)) {
    return `pair must be one of: ${orderBookService.getSupportedPairs().join(', ')}`;
  }

  if (!['buy', 'sell'].includes(type)) {
    return 'type must be either buy or sell';
  }

  if (parsePositiveNumber(price) === null) {
    return 'price must be a positive number';
  }

  if (parsePositiveNumber(quantity) === null) {
    return 'quantity must be a positive number';
  }

  return null;
}

function placeOrder(req, res) {
  const validationError = validateOrderInput(req.body);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const order = orderBookService.createOrder({
    pair: req.body.pair,
    type: req.body.type,
    price: Number(req.body.price),
    quantity: Number(req.body.quantity)
  });

  return res.status(201).json(order);
}

function cancelOrder(req, res) {
  const { id } = req.params;
  const result = orderBookService.cancelOrder(id);

  if (result.error) {
    return res.status(result.statusCode).json({ error: result.error });
  }

  return res.status(200).json(result.order);
}

function getOrderBook(req, res) {
  const { pair } = req.query;

  if (pair && !orderBookService.isSupportedPair(pair)) {
    return res.status(400).json({ error: 'Unsupported pair' });
  }

  return res.status(200).json(orderBookService.getOrderBook(pair));
}

function getTrades(req, res) {
  const { pair } = req.query;

  if (pair && !orderBookService.isSupportedPair(pair)) {
    return res.status(400).json({ error: 'Unsupported pair' });
  }

  return res.status(200).json(orderBookService.getTrades(pair));
}

function getPairs(req, res) {
  return res.status(200).json(orderBookService.getSupportedPairs());
}

module.exports = {
  placeOrder,
  cancelOrder,
  getOrderBook,
  getTrades,
  getPairs
};
