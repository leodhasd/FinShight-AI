const mongoose = require('mongoose');
const dns = require("dns");
const { env } = require('../config/env');


dns.setServers(["8.8.8.8", "1.1.1.1"]);

async function connectToDatabase() {
  mongoose.set('strictQuery', true);

  if (mongoose.connection.readyState === 1) return mongoose.connection;

  await mongoose.connect(env.MONGODB_URI, {
    autoIndex: env.NODE_ENV !== 'production'
  });

  return mongoose.connection;
}

module.exports = { connectToDatabase };

