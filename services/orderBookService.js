const Order = require('../models/Order');
const { matchBuyOrder, matchSellOrder } = require('../engine/matchingEngine');
const logger = require('../utils/logger');
const { SUPPORTED_PAIRS } = require('../config/marketConfig');

function buildInitialBooks() {
  const books = {};

  for (const pair of SUPPORTED_PAIRS) {
    books[pair] = {
      buyOrders: [],
      sellOrders: []
    };
  }

  return books;
}

class OrderBookService {
  constructor() {
    this.books = buildInitialBooks();
    this.trades = [];
    this.ordersById = new Map();
  }

  isSupportedPair(pair) {
    return SUPPORTED_PAIRS.includes(pair);
  }

  getSupportedPairs() {
    return SUPPORTED_PAIRS;
  }

  createOrder({ pair, type, price, quantity }) {
    const order = new Order({ pair, type, price, quantity });
    const book = this.books[pair];

    this.ordersById.set(order.id, order);
    logger.info('Order received', {
      orderId: order.id,
      pair: order.pair,
      type: order.type,
      price: order.price,
      quantity: order.quantity
    });

    if (order.type === 'buy') {
      matchBuyOrder(order, book.buyOrders, book.sellOrders, this.trades);
    } else {
      matchSellOrder(order, book.buyOrders, book.sellOrders, this.trades);
    }

    logger.info('Order processed', {
      orderId: order.id,
      pair: order.pair,
      status: order.status,
      remaining: order.remaining
    });

    return order;
  }

  cancelOrder(orderId) {
    const order = this.ordersById.get(orderId);

    if (!order) {
      logger.warn('Order cancel failed: not found', { orderId });
      return { error: 'Order not found', statusCode: 404 };
    }

    if (order.status === 'filled' || order.status === 'cancelled') {
      logger.warn('Order cancel failed: invalid status', {
        orderId,
        status: order.status
      });
      return { error: 'Only open or partially filled orders can be cancelled', statusCode: 400 };
    }

    const pairBook = this.books[order.pair];
    const targetBook = order.type === 'buy' ? pairBook.buyOrders : pairBook.sellOrders;
    const index = targetBook.findIndex((bookOrder) => bookOrder.id === orderId);

    if (index === -1) {
      logger.warn('Order cancel failed: not open in book', { orderId });
      return { error: 'Order is no longer open', statusCode: 400 };
    }

    targetBook.splice(index, 1);
    order.status = 'cancelled';
    logger.info('Order cancelled', {
      orderId: order.id,
      pair: order.pair,
      type: order.type,
      remaining: order.remaining
    });

    return { order };
  }

  getOrderBook(pair) {
    if (pair) {
      const book = this.books[pair];

      return {
        pair,
        buy: book.buyOrders,
        sell: book.sellOrders
      };
    }

    const result = {};
    for (const supportedPair of SUPPORTED_PAIRS) {
      result[supportedPair] = {
        buy: this.books[supportedPair].buyOrders,
        sell: this.books[supportedPair].sellOrders
      };
    }

    return result;
  }

  getTrades(pair) {
    if (!pair) {
      return this.trades;
    }

    return this.trades.filter((trade) => trade.pair === pair);
  }
}

module.exports = new OrderBookService();
