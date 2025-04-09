import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import axios from "axios";

import { sendEmail } from "../utils/sendEmail.js";
import User from "../models/user.model.js";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/env.js";
import redisClient from "../utils/redisClient.js";

export const signUp = async (req, res, next) => {
  try {
    const { phone, password, email } = req.body;
    const existingUser = await User.findOne({
      $or: [
        { email: email },
        { phone: phone }
      ]
    });
    if (existingUser) {
      const error = new Error("Phone number or email already exists");
      error.statusCode = 409;
      throw error;
    }
    const profile = {
      ...req.body,

    };
    const response = await axios.post(
      "http://localhost:3001/api/v1/profile",
      profile
    );
    if (response.status !== 201) {
      const error = new Error("Failed to create user profile");
      error.statusCode = 500;
      throw error;
    }
    const userProfile = response.data;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create([
      {
        phone,
        password: hashedPassword,
        email,
        userId: userProfile.data.profile[0]._id
      },
    ]);

    res.status(201).json({
      status: "success",
      message: "User created successfully",
      data: {
        user: newUser,
        profile: userProfile,
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message,
    });
  }
};
export const signIn = async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    const existingUser = await User.findOne({ phone });
    if (!existingUser) {
      const error = new Error("Invalid phone number or password");
      error.statusCode = 401;
      throw error;
    }
    const isPasswordCorrect = await bcrypt.compare(
      password,
      existingUser.password
    );
    if (!isPasswordCorrect) {
      const error = new Error("Invalid phone number or password");
      error.statusCode = 401;
      throw error;
    }
    const claims = {
      id: existingUser._id,
      phone: existingUser.phone,
    };
    const token = jwt.sign(
      {
        claims,
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN,
      }
    );
    res.status(200).json({
      status: "success",
      message: "User logged in successfully",
      data: {
        user: existingUser,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};
export const signOut = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    await redisClient.set(token, "revoked", {
      EX: 60 * 60 * 1,
    });

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const validateToken = async (req, res, next) => {
  try {
    console.log("validating token...");

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    const isRevoked = await redisClient.get(token);
    if (isRevoked) {
      return res.status(401).json({ message: "Token has been revoked" });
    }

    return res.status(200).json({ message: "Token is valid" });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email, phone } = req.body;
    const user = await User.findOne({ email, phone });

    if (!user) return res.status(404).json({ message: "User not found!" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    await sendEmail(email, otp);
    res.status(200).json({ 
      success: true,
      message: "OTP sent to your email!" });
  } catch (error) {
    next(error);
  }
};
export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp });
    if (!user || user.otpExpires < Date.now()) {
      return res
        .status(400)
        .json({ success: false, message: "OTP không đúng hoặc đã hết hạn" });
    }
    await user.save();
    res.status(200).json({ success: true, message: "OTP xác thực thành công" });
  } catch (error) {
    next(error);
  }
};

export const updateNewPassword = async (req, res, next) => {
  const { email, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ message: "Người dùng không tồn tại" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({
      success: true,
      message: "Đổi mật khẩu thành công!" });
  } catch (error) {
    next(error);
  }
};
