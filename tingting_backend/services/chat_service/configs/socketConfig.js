// src/config/socket.js
module.exports = {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
};