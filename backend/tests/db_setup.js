const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

const connect = async () => {
    // Prevent MongooseError: Can't call `openUri()` on an active connection with different connection strings
    await mongoose.disconnect();

    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    // The MongoDB driver loads 'os' with import(), which Jest does not support, so pass it in
    await mongoose.connect(uri, { runtimeAdapters: { os: require('os') } });
};

const close = async () => {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
};

const clear = async () => {
    if (mongoose.connection.readyState !== 0) {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany();
        }
    }
};

module.exports = { connect, close, clear };
