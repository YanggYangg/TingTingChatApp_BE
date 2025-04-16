const express = require('express');
<<<<<<< HEAD
const { sendMessage, getMessages, forwardMessage } = require('../controllers/chatController');
=======
const { sendMessage, getMessages } = require('../controllers/chatController');
>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6
const router = express.Router();

router.post('/sendMessage', sendMessage);
router.get('/getMessages', getMessages);
<<<<<<< HEAD
router.post('/forwardMessage', forwardMessage);
=======
>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6

module.exports = router;

