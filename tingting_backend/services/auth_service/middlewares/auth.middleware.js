import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";
import User from "../models/user.model.js";
<<<<<<< HEAD
import redisClient from "../utils/redisClient.js";
=======
import RevokedToken from "../models/revokedToken.model.js";
import redisClient from "../client/redisClient.js";
>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6


export const authorize = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }
<<<<<<< HEAD
       
=======
>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6
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
      
        const currentUser = await User.findById(decoded.id);

        if (!currentUser) {
            return res.status(401).json({
                status: "fail",
                message: "The user belonging to this token does no longer exist.",
            });
        }
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({
            status: "fail",
            message: "Unauthorized!",
            error: error.message,
        });

        
    }
}