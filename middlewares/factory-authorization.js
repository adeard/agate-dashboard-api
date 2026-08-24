const { validateToken } = require('../lib/jwt');
const FactoryModel = require('../models/factory');

const factoryAuthorization = async (req, res, next) => {
  try {
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
          m: 'Header Authorization tidak ditemukan, silakan login kembali',
        },
      });
    }

    const token = authorization.split(' ');

    if (token[0] !== 'Bearer' || !token[1]) {
      return res.status(403).json({
        code: 403,
        success: false,
        message: {
          title: 'Invalid Token',
          m: 'Format token tidak valid',
        },
      });
    }

    const decoded = validateToken(token[1]);

    if (!decoded || decoded.type !== 'factory' || !decoded.factory_id) {
      return res.status(403).json({
        code: 403,
        success: false,
        message: {
          title: 'Invalid Token',
          m: 'Token tidak memiliki akses factory',
        },
      });
    }

    const factory = await FactoryModel.findById(decoded.factory_id).lean();

    if (!factory) {
      return res.status(403).json({
        code: 403,
        success: false,
        message: {
          title: 'Access Denied',
          m: 'Factory tidak ditemukan atau tidak aktif',
        },
      });
    }

    req.factory = factory;
    next();
  } catch (err) {
    return res.status(403).json({
      code: 403,
      success: false,
      message: {
        title: 'Authorization Failed',
        m: err.message || 'Gagal memverifikasi token',
      },
    });
  }
};

module.exports = { factoryAuthorization };
