import { Router } from "express";
<<<<<<< HEAD
import { signIn, signUp, validateToken, forgotPassword, updateNewPassword, verifyOTP, generateToken, resentOTP, createAccount, signOut } from "../controllers/auth.controller.js";
import {authorize} from "../middlewares/auth.middleware.js";
=======
import { signIn, signUp, validateToken, forgotPassword, updateNewPassword, verifyOTP, generateToken, resentOTP, createAccount } from "../controllers/auth.controller.js";

>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6
const authRouter = Router();

authRouter.post("/sign-up", signUp);

authRouter.post("/create-account", createAccount);

authRouter.post("/sign-in", signIn);

<<<<<<< HEAD
authRouter.post("/sign-out", signOut);
=======
// authRouter.post("/sign-out", signOut);
>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6

authRouter.post("/generate-token", generateToken);

authRouter.post("/resent-otp", resentOTP);

authRouter.post("/validate-token", validateToken);

authRouter.post("/forgot-password", forgotPassword);

authRouter.post("/verify-otp", verifyOTP);

authRouter.post("/update-password", updateNewPassword);

export default authRouter;
