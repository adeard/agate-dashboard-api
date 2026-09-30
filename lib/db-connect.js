const mongoose = require('mongoose');

async function connectToDatabase() {
  const MONGO_URI = process.env.MONGO_URI;

  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: false,
    });

    return Promise.resolve('Database Connected!');
  } catch (err) {
    return Promise.reject(err);
  }
}

module.exports = connectToDatabase;
