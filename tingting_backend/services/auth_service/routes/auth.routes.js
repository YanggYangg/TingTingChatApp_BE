import { Router } from "express";
import { signIn, signOut, signUp, validateToken, forgotPassword, updateNewPassword, verifyOTP, generateToken, resentOTP, createAccount } from "../controllers/auth.controller.js";

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
