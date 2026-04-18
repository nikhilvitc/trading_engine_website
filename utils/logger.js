function formatData(data) {
  if (!data) {
    return '';
  }

  return ` ${JSON.stringify(data)}`;
}

function log(level, message, data) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}${formatData(data)}`);
}

module.exports = {
  info(message, data) {
    log('INFO', message, data);
  },
  warn(message, data) {
    log('WARN', message, data);
  },
  error(message, data) {
    log('ERROR', message, data);
  }
};