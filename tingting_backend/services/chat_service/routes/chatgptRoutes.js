
const express = require('express');
const router = express.Router();
const ChatGPTController = require('../controllers/chatgptController');
router.post('/chatgpt', ChatGPTController.chatGPTResponse);


module.exports = router;