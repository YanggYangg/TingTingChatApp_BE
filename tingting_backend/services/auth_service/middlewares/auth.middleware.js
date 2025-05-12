import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";
import User from "../models/user.model.js";
import redisClient from "../utils/redisClient.js";

export const authorize = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token;
    if (authHeader && authHeader.startsWith("Bearer")) {
      token = authHeader.split(" ")[1];
    }
    console.log("Token: ", token.trim());
    if (!token) {
      return res.status(401).json({
        status: "fail",
        message: "You are not logged in! Please log in to get access.",
      });
    }
    const isRevoked = await redisClient.get(token);
    if (isRevoked) {
      return res.status(401).json({
        status: "fail",
        message: "The token has been revoked! Please log in again.",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const currentUser = await User.findById(decoded.claims.id);

    if (!currentUser) {
      return res.status(401).json({
        status: "fail",
        message: "The current is not exist in database.",
      });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Unauthorized !!!",
      error: error.message,
    });
  }
};
