const mongoose = require('mongoose');

function maskMongoUri(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
}

async function connectDb() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(uri);
  console.log('MongoDB connected');
  console.log('MongoDB URI', maskMongoUri(uri));
  console.log('MongoDB database', mongoose.connection.name);
}

module.exports = connectDb;
