import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { PORT } from './config/env.js';
import connectToDatabase from './database/mongodb.js';

import { handleSocketConnection }  from './socket/friendRequestSocket.js';

const server = http.createServer(app);

//Config socket.io
const io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:8081"],
      //origin: "*",
      credentials: true
    }
  });

  handleSocketConnection(io); 
  
  server.listen(PORT, async () => {
    console.log(`Server running at http://localhost:${PORT}`);
    await connectToDatabase();
  });
  

