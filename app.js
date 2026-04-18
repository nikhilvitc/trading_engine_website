const express = require('express');
const path = require('path');
const orderRoutes = require('./routes/orderRoutes');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use((req, res, next) => {
  const allowedOrigin = process.env.CORS_ORIGIN || '*';

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  const noisyGetPaths = new Set(['/orderbook', '/trades', '/pairs', '/health']);

  if (!(req.method === 'GET' && noisyGetPaths.has(req.path))) {
    logger.info('HTTP request', {
      method: req.method,
      path: req.path
    });
  }

  next();
});

app.use('/', orderRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({ error: message });
});

const server = app.listen(PORT, () => {
  logger.info('Trading engine API started', { port: PORT });
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error('Port is already in use', {
      port: PORT,
      hint: 'Stop the existing process or use a different PORT'
    });
    process.exit(1);
  }

  logger.error('Server failed to start', {
    message: error.message
  });
  process.exit(1);
});
