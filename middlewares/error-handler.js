module.exports = (err, req, res, next) => {
  let code = err.code > 599 ? 500 : err.code || 500;
  let message = err.message || 'Internal server error';

  if (err.isJoi || err.name === 'ValidationError') {
    code = 400;
  }

  return res.status(code > 599 ? 500 : code).json({
    success: false,
    data: null,
    code,
    message: {
      title: err.title || (code === 400 ? 'Validation Error' : message),
      m: message,
    },
  });
};
