const express = require('express');
const orderController = require('../controllers/orderController');

const router = express.Router();

router.post('/order', orderController.placeOrder);
router.delete('/order/:id', orderController.cancelOrder);
router.get('/orderbook', orderController.getOrderBook);
router.get('/trades', orderController.getTrades);
router.get('/pairs', orderController.getPairs);

module.exports = router;
