module.exports = (err, req, res, next) => {
  let code = err.code > 599 ? 500 : err.code || 500;
  let message = err.message || 'Internal server error';

  return res.status(code > 599 ? 500 : code).json({
    success: false,
    data: null,
    code,
    message: {
      title: err.title || message,
      m: message,
    },
  });
};
