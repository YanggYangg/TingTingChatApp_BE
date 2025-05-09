const express = require('express');
const { 
    getAllNotifications,
    sendNotification } = require('../controllers/notificationController');
const router = express.Router();

router.get('/getAllNotifications', getAllNotifications);
router.post('/sendFCM', sendNotification);
module.exports = router;