// tests/helpers/db.js
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

const connectTestDB = async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: { version: "6.0.14" },
    instance: { launchTimeout: 30000 },
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Stub multi-document transactions for single-node MongoMemoryServer
  const realStartSession = mongoose.startSession.bind(mongoose);
  mongoose.startSession = async (...args) => {
    const session = await realStartSession(...args);
    session.startTransaction = () => {};
    session.commitTransaction = async () => {};
    session.abortTransaction = async () => {};
    return session;
  };
};

const clearTestDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
};

const closeTestDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
};

module.exports = {
  connectTestDB,
  clearTestDB,
  closeTestDB,
};
