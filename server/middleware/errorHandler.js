export function errorHandler(err, req, res, next) {
  console.error('[Server Error]:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    status,
    timestamp: new Date().toISOString(),
  });
}
