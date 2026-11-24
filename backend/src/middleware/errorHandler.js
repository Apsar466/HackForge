/**
 * src/middleware/errorHandler.js
 * Global Express error handler — must be registered LAST with app.use().
 */
// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || err.status || 500
  const isDev = process.env.NODE_ENV !== 'production'

  console.error(`[ErrorHandler] ${statusCode} —`, err.message)

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    // Only expose stack trace in development
    ...(isDev && { stack: err.stack }),
  })
}
