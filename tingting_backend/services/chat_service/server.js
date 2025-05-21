const { app, server } = require('./app');
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0' , () => {
    console.log(`Server/service running on port ${PORT} .....`);
});
