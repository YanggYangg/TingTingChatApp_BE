const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    avatar:{
        type: String,
    },
    name:{
        type: String,
    },
    isGroup:{
        type: Boolean,
        required: true, //true: group, false: private
    },
    participants:[{
        //userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        userId: { type: String, required: true },
        role: { type: String }//chỉ có khi isGroup = true
    }
    ],
    lastMessage:{
        type: mongoose.Schema.Types.ObjectId, ref: 'Message'
    },
    createAt:{
        type: Date,
        default: Date.now
    },
    updateAt:{
        type: Date,
        default: Date.now
    }
});

module.exports =  mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);