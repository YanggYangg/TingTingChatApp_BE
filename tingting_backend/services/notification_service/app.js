const express = require('express');
const cors = require('cors');
const connectDB = require('./configs/db');
require('dotenv').config();

const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/notifications', notificationRoutes);
connectDB();

app.get("/", (req, res) => {
    res.send("Notification Service is running.....");
});

module.exports = app;