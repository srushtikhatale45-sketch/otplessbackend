const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.stack);
  
  const statusCode = err.status || 500;
  
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack 
    })
  });
};

module.exports = errorHandler;