const FactoryModel = require('../../models/factory');
const { generateToken } = require('../../lib/jwt');
const { createResponseSuccess } = require('../../utils/helpers');
const { vBody } = require('../../validators/joi');

class FactoryAuthController {
  static async login(req, res, next) {
    try {
      const body = req.body;
      await vBody('factory-login', body);

      const { api_key, api_secret } = body;

      const factory = await FactoryModel.findOne({
        api_key,
        api_secret,
      }).lean();

      if (!factory) {
        throw {
          code: 401,
          message: 'api_key atau api_secret tidak valid',
          title: 'Autentikasi Gagal',
        };
      }

      const tokenPayload = {
        factory_id: factory._id,
        company_id: factory.company,
        factory_name: factory.name,
        type: 'factory',
      };

      const token = generateToken(tokenPayload);

      return res.status(200).json(
        createResponseSuccess(200, 'Success', 'Berhasil login factory', {
          access_token: token,
          token_type: 'Bearer',
          factory: {
            id: factory._id,
            name: factory.name,
            company: factory.company,
          },
        })
      );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = FactoryAuthController;
