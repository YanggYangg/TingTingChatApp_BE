const mongoose = require('mongoose');
const Notification = require('../models/Notification');

module.exports = {
    getAllNotifications: async (req, res) => {
        try{
            const notifications = await Notification.find();
            console.log("=====Test console Notifications=====:",notifications);
            res.status(200).json(notifications);
        }catch(error){
            cónsole.log("=====Khong get duoc Notifications=====");
            res.status(500).json({message: "Error when get all notifications"});
        }
    },
};