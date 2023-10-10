const { comparePass } = require('../../lib/bcrypt');
const { generateToken } = require('../../lib/jwt');
const UserModel = require('../../models/user');
const { sendEmail } = require('../../utils/email');
const { createResponseSuccess } = require('../../utils/helpers');

class AuthController {
  static async signIn(req, res, next) {
    try {
      const body = req.body;
      const user = await UserModel.findOne({ email: body.email }).lean();

      if (!user) {
        throw {
          code: 400,
          message: 'Mohon maaf, periksa kembali username atau password anda',
          title: 'Username / Password Salah',
        };
      }

      if (user.status === 0) {
        throw {
          code: 400,
          message: 'Mohon maaf akun yang anda masukkan sudah tidak aktif',
          title: 'Akun Tidak Aktif',
        };
      }

      const comparePassword = comparePass(body.password, user.password);

      if (!comparePassword) {
        throw {
          code: 400,
          message: 'Mohon maaf, periksa kembali username atau password anda',
          title: 'Username / Password Salah',
        };
      }

      return res.status(200).json(
        createResponseSuccess(200, 'Success', 'Success sign in user', {
          access_token: generateToken(user),
        })
      );
    } catch (err) {
      next(err);
    }
  }

  static async decodeToken(req, res, next) {
    try {
      const user = req.user;
      const foundUser = await UserModel.findById(user._id).lean();

      if (!foundUser) {
        throw {
          code: 404,
          title: 'Not Found',
          message: 'User tidak ditemukan',
        };
      }

      delete foundUser['password'];

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            'Success',
            'Success decode token',
            foundUser
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async forgotPassword(req, res, next) {
    try {
      const body = req.body;
      const user = await UserModel.findOne({ email: body.email }).lean();

      if (!user) {
        throw {
          code: 404,
          message:
            'Mohon maaf, akun anda tidak ditemukan, silakan masukkan email terdaftar.',
          title: 'Akun Tidak Ditemukan',
        };
      }

      if (user.is_active === false) {
        throw {
          code: 400,
          message: 'Mohon maaf akun yang anda masukkan sudah tidak aktif',
          title: 'Akun Tidak Aktif',
        };
      }

      const generatedToken = generateToken({
        _id: user._id,
        email: user.email,
      });
      const changePasswordUrl = `${process.env.FE_URL}?token=${generatedToken}`;

      await sendEmail({
        toAddress: [body.email],
        subject: 'Link Ganti Password Anda',
        message: `Halo, berikut tautan untuk mengubah password anda: ${changePasswordUrl}`,
      });

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            'Success',
            'Email konfirmasi sudah dikirimkan ke email anda',
            {}
          )
        );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;
