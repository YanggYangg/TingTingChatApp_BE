const mongoose = require('mongoose');

const userFcmTokenSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    unique: true 
},
  fcmToken: { 
    type: String, 
    required: true 
},
  updatedAt: { 
    type: Date, 
    default: Date.now 
},
});

module.exports = mongoose.model('UserFcmToken', userFcmTokenSchema);
