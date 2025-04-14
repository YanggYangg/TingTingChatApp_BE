const express = require('express');
const { getAllConversations, createConversation } = require('../controllers/conversationController');
const router = express.Router();

router.get('/', getAllConversations);
router.post('/createConversation', createConversation);

module.exports = router;