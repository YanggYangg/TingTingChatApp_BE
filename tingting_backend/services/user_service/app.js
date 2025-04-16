import express from 'express';
import cors from "cors";
import { PORT } from './config/env.js';
import connectToDatabase from './database/mongodb.js';
import cookieParser from 'cookie-parser';
import errorMiddleware from './middlewares/error.middleware.js';
import profileRouter from './routes/profile.routes.js';
import friendRequestRouter from './routes/friendRequest.routes.js';


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
<<<<<<< HEAD


app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
=======
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
  }));
>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6

app.use('/api/v1/profile', profileRouter);
app.use('/api/v1/friendRequest', friendRequestRouter);

<<<<<<< HEAD
=======

>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6
app.use(errorMiddleware);

app.listen (PORT, async () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
    console.log(new Date());
    await connectToDatabase();
});
export default app;