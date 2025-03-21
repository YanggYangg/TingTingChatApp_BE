const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId:{
        type: mongoose.Schema.Types.ObjectId, ref: 'Conversation',
        required: true
    },
    sender:[
        {
            //userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            userId: { 
                type: String, 
                required: true 
            },
            content: {
                type: String,
                required: true
            },
            messageType:{
                type: String,
                enum: ['text', 'image', 'file', 'video'],
                required: true
            },
            status:{
                type: String,
                enum: ['sent', 'received', 'viewed'],
                default: 'sent'
            },
            time:{
                type: Date,
                default: Date.now
            }
        }
    ],
    createdAt: { 
        type: Date, 
        default: Date.now }
});
module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);