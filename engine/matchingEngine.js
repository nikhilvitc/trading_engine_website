const Trade = require('../models/Trade');
const logger = require('../utils/logger');

function insertBuyOrder(buyOrders, order) {
  buyOrders.push(order);
  buyOrders.sort((a, b) => {
    if (b.price !== a.price) {
      return b.price - a.price;
    }

    return a.timestamp - b.timestamp;
  });
}

function insertSellOrder(sellOrders, order) {
  sellOrders.push(order);
  sellOrders.sort((a, b) => {
    if (a.price !== b.price) {
      return a.price - b.price;
    }

    return a.timestamp - b.timestamp;
  });
}

function updateStatus(order) {
  if (order.remaining === 0) {
    order.status = 'filled';
  } else if (order.remaining < order.quantity) {
    order.status = 'partially_filled';
  } else {
    order.status = 'open';
  }
}

function matchBuyOrder(incomingOrder, buyOrders, sellOrders, trades) {
  // Buy orders should execute against the lowest-priced sell orders first.
  // Within the same price level, older orders execute first (FIFO).
  while (incomingOrder.remaining > 0 && sellOrders.length > 0) {
    const bestSell = sellOrders[0];

    if (bestSell.price > incomingOrder.price) {
      break;
    }

    const tradeQuantity = Math.min(incomingOrder.remaining, bestSell.remaining);
    const tradePrice = bestSell.price;

    incomingOrder.remaining -= tradeQuantity;
    bestSell.remaining -= tradeQuantity;

    const trade = new Trade({
      pair: incomingOrder.pair,
      buyOrderId: incomingOrder.id,
      sellOrderId: bestSell.id,
      price: tradePrice,
      quantity: tradeQuantity
    });

    trades.push(trade);
    logger.info('Trade executed', {
      tradeId: trade.id,
      pair: trade.pair,
      buyOrderId: trade.buyOrderId,
      sellOrderId: trade.sellOrderId,
      price: trade.price,
      quantity: trade.quantity
    });

    updateStatus(incomingOrder);
    updateStatus(bestSell);

    if (bestSell.remaining === 0) {
      sellOrders.shift();
    }
  }

  if (incomingOrder.remaining > 0) {
    updateStatus(incomingOrder);
    insertBuyOrder(buyOrders, incomingOrder);
  }
}

function matchSellOrder(incomingOrder, buyOrders, sellOrders, trades) {
  // Sell orders should execute against the highest-priced buy orders first.
  // Within the same price level, older orders execute first (FIFO).
  while (incomingOrder.remaining > 0 && buyOrders.length > 0) {
    const bestBuy = buyOrders[0];

    if (bestBuy.price < incomingOrder.price) {
      break;
    }

    const tradeQuantity = Math.min(incomingOrder.remaining, bestBuy.remaining);
    const tradePrice = bestBuy.price;

    incomingOrder.remaining -= tradeQuantity;
    bestBuy.remaining -= tradeQuantity;

    const trade = new Trade({
      pair: incomingOrder.pair,
      buyOrderId: bestBuy.id,
      sellOrderId: incomingOrder.id,
      price: tradePrice,
      quantity: tradeQuantity
    });

    trades.push(trade);
    logger.info('Trade executed', {
      tradeId: trade.id,
      pair: trade.pair,
      buyOrderId: trade.buyOrderId,
      sellOrderId: trade.sellOrderId,
      price: trade.price,
      quantity: trade.quantity
    });

    updateStatus(incomingOrder);
    updateStatus(bestBuy);

    if (bestBuy.remaining === 0) {
      buyOrders.shift();
    }
  }

  if (incomingOrder.remaining > 0) {
    updateStatus(incomingOrder);
    insertSellOrder(sellOrders, incomingOrder);
  }
}

module.exports = {
  matchBuyOrder,
  matchSellOrder
};
