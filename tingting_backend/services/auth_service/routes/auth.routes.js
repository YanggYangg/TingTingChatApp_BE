import { Router } from "express";
import { signIn, signUp, validateToken, forgotPassword, updateNewPassword, verifyOTP, generateToken, resentOTP, createAccount, signOut } from "../controllers/auth.controller.js";
import {authorize} from "../middlewares/auth.middleware.js";
const authRouter = Router();

authRouter.post("/sign-up", signUp);

authRouter.post("/create-account", createAccount);

authRouter.post("/sign-in", signIn);

authRouter.post("/sign-out", signOut);

authRouter.post("/generate-token", generateToken);

authRouter.post("/resent-otp", resentOTP);

authRouter.post("/validate-token", validateToken);

authRouter.post("/forgot-password", forgotPassword);

authRouter.post("/verify-otp", verifyOTP);

authRouter.post("/update-password", updateNewPassword);

export default authRouter;
