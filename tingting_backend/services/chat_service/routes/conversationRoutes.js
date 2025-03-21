const express = require('express');
const { getAllConversations } = require('../controllers/conversationController');
const router = express.Router();

router.get('/', getAllConversations);
module.exports = router;