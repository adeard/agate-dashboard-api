const { hashPassword, comparePass } = require('../../lib/bcrypt');
const { decodeToken } = require('../../lib/jwt');
const FactoryModel = require('../../models/factory');
const UserModel = require('../../models/user');
const { sendEmail } = require('../../utils/email');
const {
  createResponseSuccess,
  generateRandomPassword,
} = require('../../utils/helpers');
const { getBasicQuery } = require('../../utils/query-helpers');
const { vBody } = require('../../validators/joi');

const ObjectId = require('mongoose').Types.ObjectId;

class UserController {
  static async getAllUser(req, res, next) {
    try {
      const user = req.user;
      const { query, page, limit } = getBasicQuery(req.query, {
        parseToNumber: ['status'],
      });

      const regexPattern = new RegExp(query.full_name || '', 'i');

      const users = await UserModel.aggregate([
        {
          $match: {
            ...query,
            full_name: { $regex: regexPattern },
            company: new ObjectId(user.company),
          },
        },
        {
          $sort: {
            updatedAt: -1,
          },
        },
        {
          $project: {
            full_name: 1,
            email: 1,
            status: 1,
            access_factory: 1,
            whatsapp_number: 1,
            subscribe_notification: 1,
            company: 1,
            role: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ]);
      const userTotal = await UserModel.countDocuments({});

      return res.status(200).json(
        createResponseSuccess(200, 'Success', 'Success get all users', users, {
          total_data: userTotal,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  static async getUserDetail(req, res, next) {
    try {
      const userId = req.params.userId;
      const user = await UserModel.findById(userId).lean();

      delete user['password'];

      return res.status(200).json(
        createResponseSuccess(200, 'Success', 'Success get user', {
          user,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  static async createUser(req, res, next) {
    try {
      const body = req.body;
      const user = req.user;

      await vBody('user', body);

      const existedUser = await UserModel.findOne({
        email: body.email,
      }).lean();

      if (existedUser) {
        throw {
          code: 400,
          title: 'Email Telah Terdaftar',
          message:
            'Maaf email yang anda masukan sudah digunakan, silakan gunakan email yang lain.',
        };
      }

      // const password = generateRandomPassword(6);
      const password = "agate123"

      // console.log({ password });

      await UserModel.create({
        ...body,
        password: hashPassword(password),
        role: 1,
        company: user.company,
      });

      await sendEmail({
        toAddress: [body.email],
        subject: 'Password Akun',
        message: `Halo, berikut password akun anda: ${password}`,
      });

      return res
        .status(201)
        .json(
          createResponseSuccess(
            201,
            'Berhasil Membuat Akun',
            'Anda berhasil menambahkan pengguna baru'
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async updateUser(req, res, next) {
    try {
      const body = req.body;
      const { userId } = req.params;

      await vBody('user', body);

      const existedUser = await UserModel.findById(userId).lean();

      if (!existedUser) {
        throw {
          code: 400,
          title: 'User tidak ditemukan',
          message: 'Maaf user tersebut tidak dapat ditemukan.',
        };
      }

      await UserModel.findByIdAndUpdate(userId, {
        $set: {
          ...body,
        },
      });

      return res
        .status(201)
        .json(
          createResponseSuccess(
            201,
            'Berhasil Memperbaharui Akun',
            'Anda berhasil memperbahuri data pengguna'
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const user = req.user;
      const body = req.body;

      await vBody('change-password', body);

      const foundedUser = await UserModel.findById(user._id).lean();

      const compareOldPassword = comparePass(
        body.old_password,
        foundedUser.password
      );

      if (!compareOldPassword) {
        throw {
          code: 400,
          message: 'Mohon maaf, periksa kembali password lama anda',
          title: 'Password Salah',
        };
      }

      await UserModel.findByIdAndUpdate(user._id, {
        password: hashPassword(body.new_password),
      });

      return res
        .status(200)
        .json(
          createResponseSuccess(200, 'Success', 'Success change password', {})
        );
    } catch (err) {
      next(err);
    }
  }

  static async setupPassword(req, res, next) {
    try {
      const body = req.body;

      await vBody('setup-password', body);

      if (!body.token) {
        throw {
          code: 400,
          message: 'Mohon maaf, token yang anda masukan tidak valid',
          title: 'Token Tidak Valid',
        };
      }

      const user = decodeToken(body.token);

      if (!user) {
        throw {
          code: 400,
          message: 'Mohon maaf, token yang anda masukan tidak valid',
          title: 'Token Tidak Valid',
        };
      }

      const foundedUser = await UserModel.findById(user._id).lean();

      if (!foundedUser || foundedUser.is_active === false) {
        throw {
          code: 400,
          message: 'Mohon maaf, akun anda tidak ditemukan / tidak aktif',
          title: 'Akun Tidak Ditemukan',
        };
      }

      if (body.new_password !== body.confirm_new_password) {
        throw {
          code: 400,
          message: 'Mohon maaf, periksa kembali password baru anda',
          title: 'Password Tidak Sama',
        };
      }

      await UserModel.findByIdAndUpdate(user._id, {
        password: hashPassword(body.new_password),
      });

      return res
        .status(200)
        .json(
          createResponseSuccess(
            200,
            'Success',
            'Berhasil membuat password baru',
            {}
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const { userId } = req.body;

      const existedUser = await UserModel.findById(userId).lean();

      if (!existedUser) {
        throw {
          code: 400,
          title: 'User Tidak Ditemukan',
          message: 'Maaf user yang anda pilih tidak ditemukan.',
        };
      }

      const password = generateRandomPassword(6);

      await UserModel.findByIdAndUpdate(userId).updateOne({
        $set: {
          password: hashPassword(password),
        },
      });

      await sendEmail({
        toAddress: [existedUser.email],
        subject: 'Reset Password Akun Batamindo Farm',
        message: `Halo, berikut password baru akun anda: ${password}`,
      });

      return res
        .status(200)
        .json(
          createResponseSuccess(200, 'Success', 'Berhasil reset password', {})
        );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = UserController;
