const jwt = require('jsonwebtoken');

function generateToken(data) {
  return jwt.sign(data, process.env.SECRET_KEY);
}

function validateToken(token) {
  return jwt.verify(token, process.env.SECRET_KEY);
}

function decodeToken(token) {
  return jwt.decode(token, process.env.SECRET_KEY);
}

module.exports = { generateToken, validateToken, decodeToken };
