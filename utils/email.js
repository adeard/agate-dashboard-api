const axios = require('axios');

const sendEmail = async ({ toAddress, subject, message, htmlBody }) => {
  const obj = {
    From: process.env.EMAIL_POSTMARK,
    To: toAddress ? toAddress.join('') : '',
    Subject: subject,
    TextBody: message,
    HtmlBody: htmlBody,
    // MessageStream: stream
  };

  try {
    await axios.post('https://api.postmarkapp.com/email', obj, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': process.env.SERVER_POSTMARK,
      },
    });

    return true;
  } catch (err) {
    return Promise.reject({
      code: 500,
      title: 'Email Gagal Terkirim',
      message: 'Terjadi kesalahan',
    });
  }
};

module.exports = { sendEmail };
