const express = require('express');
const cors = require('cors');
const connectDB = require('./configs/db');
require('dotenv').config();
require('./rabbitmq/consumer'); // Start the RabbitMQ consumer

const notificationRoutes = require('./routes/notificationRoutes');
const userFcmTokenRoutes = require('./routes/userFcmTokenRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/notifications', notificationRoutes);
app.use('/userFcmToken', userFcmTokenRoutes);
connectDB();

app.get("/", (req, res) => {
    res.send("Notification Service is running.....");
});

module.exports = app;