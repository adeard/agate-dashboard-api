const { validateToken } = require('../lib/jwt');

const authorization = (req, res, next) => {
  let authorization = req.headers['authorization'];
  
  if (!authorization && req.query.token) {
    authorization = `Bearer ${req.query.token}`;
  }

  if (!authorization) {
    return res.status(403).json({
      code: 403,
      success: false,
      message: {
        title: 'Authorization Failed',
        m: 'Failed to authenticate user, please check your account',
      },
      redirect: '/login',
    });
  }

  const token = authorization.split(' ');

  if (token[0] !== 'Bearer') {
    return res.status(403).json({
      code: 403,
      success: false,
      message: {
        title: 'Invalid Token',
        m: 'Please provide a valid token',
      },
      redirect: '/login',
    });
  }

  const userVerified = validateToken(token[1]);

  if (!userVerified) {
    return res.status(403).json({
      code: 403,
      success: false,
      message: {
        title: 'Invalid Token',
        m: 'Please provide a valid token',
      },
      redirect: '/login',
    });
  }

  if (!userVerified['company']) {
    return res.status(403).json({
      code: 403,
      success: false,
      message: {
        title: 'Invalid Token',
        m: 'Please provide a valid token',
      },
      redirect: '/login',
    });
  }

  req.user = userVerified;
  next();
};

function adminAccess(req, res, next) {
  if (req.user.type === 1) {
    next();
  } else {
    throw {
      code: 401,
      message: 'Hanya dapat dilakukan oleh admin',
      title: 'Tidak ada akses.',
    };
  }
}

function validateClientKey(req, res, next) {
  const headers = req.headers;

  if (headers['client-key'] === process.env.CLIENT_KEY) {
    next();
  } else {
    throw {
      code: 403,
      message: 'Invalid client key',
      title: 'Not Allowed',
    };
  }
}

module.exports = { authorization, adminAccess, validateClientKey };
