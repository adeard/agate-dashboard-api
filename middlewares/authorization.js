const { validateToken } = require('../lib/jwt');

const authorization = (req, res, next) => {
  const authorization = req.headers['authorization'];

  if (!authorization) {
    return res.status(403).json({
      code: 403,
      success: false,
      message: {
        title: 'Authorization Failed',
        m: 'Failed to authenticate user, please check your account',
      },
      redirect: '/auth/login',
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
      redirect: '/auth/login',
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
      redirect: '/auth/login',
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

module.exports = { authorization, adminAccess };
