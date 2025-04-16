import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import axios from "axios";

import { sendEmail } from "../utils/sendEmail.js";
import User from "../models/user.model.js";
import {
  JWT_SECRET,
  JWT_EXPIRES_IN,
<<<<<<< HEAD
  PORT_USER_SERVICE,
=======
  KEY_FREESMS,
  DEVICE_NUMBER,
>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6
} from "../config/env.js";
import redisClient from "../utils/redisClient.js";

export const signUp = async (req, res, next) => {
  try {
    const { phone, email } = req.body;
    const existingUser = await User.findOne({
      $or: [{ email: email }, { phone: phone }],
    });
    if (existingUser) {
      const error = new Error("Phone number or email already exists");
      error.statusCode = 409;
      throw error;
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redisClient.set(`${phone}:sign-up`, otp, {
      EX: 60 * 5,
    });
<<<<<<< HEAD
    // const message = `Mã OTP của bạn là: ${otp}. Vui lòng không chia sẻ mã này với bất kỳ ai khác. Mã sẽ hết hạn sau 5 phút.`;
    // const response = await axios.get(
    //   `https://admin.freesms.vn/services/send.php?key=e72265fc102bed73c044e6a59227aff746c4e834&number=${phone}&message=${message}&devices=108&type=sms&prioritize=1`
    // );
    // if (response.status !== 200) {
    //   const error = new Error("Failed to send OTP");
    //   error.statusCode = 500;
    //   throw error;
    // }
=======
    const message = `Mã OTP của bạn là: ${otp}. Vui lòng không chia sẻ mã này với bất kỳ ai khác. Mã sẽ hết hạn sau 5 phút.`;
    const response = await axios.get(
      `https://admin.freesms.vn/services/send.php?key=${KEY_FREESMS}&number=${phone}&message=${message}&devices=105&type=sms&prioritize=1`
    );
    if (response.status !== 200) {
      const error = new Error("Failed to send OTP");
      error.statusCode = 500;
      throw error;
    }
>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6
    res.status(200).json({
      success: true,
      message: "Valid data! Check your phone for the OTP",
    });
<<<<<<< HEAD
=======
    // const profile = {
    //   ...req.body,

    // };
    // const response = await axios.post(
    //   "http://localhost:3001/api/v1/profile",
    //   profile
    // );
    // if (response.status !== 201) {
    //   const error = new Error("Failed to create user profile");
    //   error.statusCode = 500;
    //   throw error;
    // }
    // const userProfile = response.data;
    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);

    // const newUser = await User.create([
    //   {
    //     phone,
    //     password: hashedPassword,
    //     email,
    //     userId: userProfile.data.profile[0]._id
    //   },
    // ]);

    // res.status(201).json({
    //   status: "success",
    //   message: "User created successfully",
    //   data: {
    //     user: newUser,
    //     profile: userProfile,
    //   },
    // });
>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};
export const createAccount = async (req, res, next) => {
  try {
    const { phone, otp, password, email } = req.body;

    const existingUser = await User.findOne({
      $or: [{ phone: phone }],
    });
    if (existingUser) {
      const error = new Error("Phone number already exists");
      error.statusCode = 409;
      throw error;
    }

    const redisOtp = await redisClient.get(`${phone}:sign-up`);
    if (!redisOtp || redisOtp !== otp) {
      return res
        .status(400)
        .json({ message: "OTP is not valid or has expired" });
    }
    await redisClient.del(`${phone}:sign-up`);

    const profile = {
      ...req.body,
    };
<<<<<<< HEAD

    const response = await axios.post(
      `http://localhost:${PORT_USER_SERVICE}/api/v1/profile`,
      profile
    );
    console.log("profile", profile);
=======
    const response = await axios.post(
      "http://localhost:3001/api/v1/profile",
      profile
    );
>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6
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
        userId: userProfile.data.profile[0]._id,
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
      success: false,
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
<<<<<<< HEAD
    const createdAt = existingUser.createdAt.getTime();
    const currentTime = new Date().getTime();
    const timeDiff = currentTime - createdAt;
    const threeMinutes = 3 * 60 * 1000; // 3 phút
    if (timeDiff < threeMinutes) {
      const token = jwt.sign(
        { id: existingUser._id, phone: existingUser.phone },
        JWT_SECRET,
        {
          expiresIn: JWT_EXPIRES_IN,
        }
      );
      await redisClient.set(`${phone}:token`, token, {
        EX: 60 * 60 * 1,
      });
      return res.status(200).json({
        success: true,
        login: true,
        message: "User logged in successfully",
        data: {
          user: existingUser,
          token,
        },
      });
    } else {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      await redisClient.set(`${phone}:sign-in`, otp, {
        EX: 60 * 5,
      });
      // const message = `Mã OTP của bạn là: ${otp}. Vui lòng không chia sẻ mã này với bất kỳ ai khác. Mã sẽ hết hạn sau 5 phút.`;

      // const response = await axios.get(
      //   `https://admin.freesms.vn/services/send.php?key=e72265fc102bed73c044e6a59227aff746c4e834&number=${phone}&message=${message}&devices=108&type=sms&prioritize=1`
      // );
      // if (response.status !== 200) {
      //   const error = new Error("Failed to send OTP");
      //   error.statusCode = 500;
      //   throw error;
      // }
      res.status(200).json({
        success: true,
        message: "Valid data! Check your phone for the OTP",
      });
    }
=======
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await redisClient.set(`${phone}:sign-in`, otp, {
      EX: 60 * 5,
    });
    const message = `Mã OTP của bạn là: ${otp}. Vui lòng không chia sẻ mã này với bất kỳ ai khác. Mã sẽ hết hạn sau 5 phút.`;

    const response = await axios.get(
      `https://admin.freesms.vn/services/send.php?key=${KEY_FREESMS}&number=${phone}&message=${message}&devices=105&type=sms&prioritize=1`
    );
    if (response.status !== 200) {
      const error = new Error("Failed to send OTP");
      error.statusCode = 500;
      throw error;
    }
    res.status(200).json({
      success: true,
      message: "Valid data! Check your phone for the OTP",
    });
>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6
  } catch (error) {
    next(error);
  }
};
export const generateToken = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    const redisOtp = await redisClient.get(`${phone}:sign-in`);
    if (!redisOtp || redisOtp !== otp) {
      return res
        .status(400)
        .json({ message: "OTP is not valid or has expired" });
    }
    await redisClient.del(`${phone}:sign-in`);
<<<<<<< HEAD

=======
  
>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6
    const existingUser = await User.findOne({ phone });

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
    await redisClient.set(`${phone}:token`, token, {
      EX: 60 * 60 * 1,
    });

    res.status(200).json({
      success: true,
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
export const resentOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const existingUser = await User.findOne({ phone });
    if (!existingUser) {
      const error = new Error("Invalid phone number");
      error.statusCode = 401;
      throw error;
    }
    await redisClient.del(`${phone}:sign-in`);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await redisClient.set(`${phone}:sign-in`, otp, {
      EX: 60 * 5,
    });
<<<<<<< HEAD
    // const message = `Mã OTP của bạn là: ${otp}. Vui lòng không chia sẻ mã này với bất kỳ ai khác. Mã sẽ hết hạn sau 5 phút.`;

    // const response = await axios.get(
    //   `https://admin.freesms.vn/services/send.php?key=e72265fc102bed73c044e6a59227aff746c4e834&number=${phone}&message=${message}&devices=108&type=sms&prioritize=1`
    // );
    // if (response.status !== 200) {
    //   const error = new Error("Failed to send OTP");
    //   error.statusCode = 500;
    //   throw error;
    // }
=======
    const message = `Mã OTP của bạn là: ${otp}. Vui lòng không chia sẻ mã này với bất kỳ ai khác. Mã sẽ hết hạn sau 5 phút.`;

    const response = await axios.get(
      `https://admin.freesms.vn/services/send.php?key=${KEY_FREESMS}&number=${phone}&message=${message}&devices=105&type=sms&prioritize=1`
    );
    if (response.status !== 200) {
      const error = new Error("Failed to send OTP");
      error.statusCode = 500;
      throw error;
    }
>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6
    res.status(200).json({
      success: true,
      message: "Mã OTP đã được gửi lại thành công!",
    });
  } catch (error) {
    next(error);
  }
};
export const signOut = async (req, res, next) => {
  try {
<<<<<<< HEAD
    console.log("signOut");

    let token;
    const authHeader = req.headers.authorization;

    console.log("Authorization Header:", authHeader);

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    console.log("Extracted Token:", token);

    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "Invalid or missing token" });
    }

    await redisClient.set(token, "revoked", {
      EX: 60 * 60 * 1, // 1 hour
    });

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
=======
    
    const authHeader = req.headers.authorization;
   

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    await redisClient.set(token, "revoked", {
      EX: 60 * 60 * 1,
    });
    console.log("signing out...");
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6
    next(error);
  }
};

export const validateToken = async (req, res, next) => {
  try {
<<<<<<< HEAD
=======
    console.log("validating token...");

>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No token found in the header");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
<<<<<<< HEAD
    //get phone from token
    const decoded = jwt.verify(token, JWT_SECRET);
    const phone = decoded.claims.phone;
    console.log("Phone", phone);
    console.log("Decoded token = ", token);
    if (phone) {
      const tokenRedis = await redisClient.get(`${phone}:token`);
      if (tokenRedis !== null && token === tokenRedis) {
        console.log("Token is valid in redis");
        return res
          .status(200)
          .json({ message: "Token is valid", success: true });
      } else {
        next(new Error("Token is not valid"));
      }
    } else {
      const isRevoked = await redisClient.get(token);
      if (isRevoked) {
        return res.status(401).json({ message: "Token has been revoked" });
      }

      return res.status(200).json({ message: "Token is valid" });
    }
=======

    console.log("token", token);

    const phone = req.body.phone;

    const isRevoked = await redisClient.get(`${phone}:token`);
    if (isRevoked) {
      return res.status(401).json({ message: "Token has been revoked", success: false });
    }

    return res.status(200).json({ message: "Token is valid", success: true });
>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone });

    if (!user) return res.status(404).json({ message: "User not found!" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redisClient.set(`${phone}:reset-pass`, otp, {
      EX: 60 * 5,
    });

    // await sendEmail(email, otp);
    // res.status(200).json({
    //   success: true,
    //   message: "OTP sent to your email!" });

<<<<<<< HEAD
    // const message = `Mã OTP của bạn là: ${otp}. Vui lòng không chia sẻ mã này với bất kỳ ai khác. Mã sẽ hết hạn sau 5 phút.`;
    // const response = await axios.get(
    //   `https://admin.freesms.vn/services/send.php?key=e72265fc102bed73c044e6a59227aff746c4e834&number=${phone}&message=${message}&devices=108&type=sms&prioritize=1`
    // );
    // if (response.status !== 200) {
    //   const error = new Error("Failed to send OTP");
    //   error.statusCode = 500;
    //   throw error;
    // }
=======
    const message = `Mã OTP của bạn là: ${otp}. Vui lòng không chia sẻ mã này với bất kỳ ai khác. Mã sẽ hết hạn sau 5 phút.`;
    const response = await axios.get(
      `https://admin.freesms.vn/services/send.php?key=${KEY_FREESMS}&number=${phone}&message=${message}&devices=105&type=sms&prioritize=1`
    );
    if (response.status !== 200) {
      const error = new Error("Failed to send OTP");
      error.statusCode = 500;
      throw error;
    }
>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6
    res.status(200).json({
      success: true,
      message: "Mã OTP đã được gửi đến số điện thoại của bạn!",
    });
  } catch (error) {
    next(error);
  }
};
export const verifyOTP = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    const redisOtp = await redisClient.get(`${phone}:reset-pass`);
    if (!redisOtp || redisOtp !== otp) {
      return res
        .status(400)
        .json({ message: "OTP không đúng hoặc đã hết hạn" });
    }
    await redisClient.del(`${phone}:reset-pass`);
    res.status(200).json({ success: true, message: "OTP xác thực thành công" });
  } catch (error) {
    next(error);
  }
};

export const updateNewPassword = async (req, res, next) => {
  const { phone, newPassword } = req.body;
  try {
    const user = await User.findOne({ phone });

    if (!user)
      return res.status(404).json({ message: "Người dùng không tồn tại" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({
      success: true,
      message: "Đổi mật khẩu thành công!",
    });
  } catch (error) {
    next(error);
  }
<<<<<<< HEAD
};
=======
};
>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6
