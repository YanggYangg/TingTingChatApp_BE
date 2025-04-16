import express from 'express';
import cors from "cors";
import { PORT } from './config/env.js';
import connectToDatabase from './database/mongodb.js';
import cookieParser from 'cookie-parser';
import errorMiddleware from './middlewares/error.middleware.js';
import authRouter from './routes/auth.routes.js';



const app = express();
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json(
  { extended: true } // to support JSON-encoded bodies
));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());



app.use('/api/v1/auth', authRouter);

app.use(errorMiddleware);

app.listen (PORT, async () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
    console.log(new Date());
    await connectToDatabase();
});
export default app;