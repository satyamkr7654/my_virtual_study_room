const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: false // Not required if file is present
  },
  fileId: mongoose.Schema.Types.ObjectId, // GridFS file
  fileUrl: String, // Legacy messages only
  fileName: String,
  fileType: String,
  clientId: String, // Set by the sender so a retry is not saved twice
  timestamp: {
    type: Date,
    default: Date.now
  }
});

messageSchema.index({ room: 1, _id: -1 });
messageSchema.index({ user: 1, clientId: 1 });

module.exports = mongoose.model('Message', messageSchema);
