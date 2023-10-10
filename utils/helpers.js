const whitelistObjectId = ['greenhouse', 'device'];

module.exports = {
  createResponseSuccess: (code, title, m, data, meta) => {
    return {
      success: true,
      code,
      message: {
        title,
        m,
      },
      data,
      meta: meta || {},
    };
  },

  checkEmptyObject: (object) => {
    const oKeys = Object.keys(object);
    return oKeys.length === 0 || oKeys.some((key) => !object[key]);
  },

  generateRandomPassword: (length) => {
    const alphanum =
      'ABCDEFGHIJKLMNOPRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * alphanum.length);
      result += alphanum[randomIndex];
    }

    return result;
  },

  deleteEmptyObjectValue: (object) => {
    return Object.keys(object).forEach((key) => {
      if (
        object[key] === null ||
        !object[key] === undefined ||
        typeof object[key] === 'undefined' ||
        object[key] === ''
      ) {
        delete object[key];
      }
    });
  },
};
