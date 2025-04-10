import express from 'express';
import cors from "cors";
import { PORT } from './config/env.js';
import connectToDatabase from './database/mongodb.js';
import cookieParser from 'cookie-parser';
import errorMiddleware from './middlewares/error.middleware.js';
import profileRouter from './routes/profile.routes.js';


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cookieParser());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
  }));

app.use('/api/v1/profile', profileRouter);



app.use(errorMiddleware);

app.listen (PORT, async () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
    console.log(new Date());
    await connectToDatabase();
});
export default app;