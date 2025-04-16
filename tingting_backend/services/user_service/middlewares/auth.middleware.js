import axios from "axios";
<<<<<<< HEAD
import { PORT_AUTH_SERVICE} from "../config/env.js";
import { log } from "console";

export const authorize = async (req, res, next) => {
  const token = req.headers.authorization;
  const phone = req.body.phone;
  console.log("phone ne = " , phone);
  
=======

export const authorize = async (req, res, next) => {
  const token = req.headers.authorization;
>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6
  if (!token) return res.status(401).json({ error: "No token" });
 
  try {
    const response = await axios.post(
<<<<<<< HEAD
      `http://localhost:${PORT_AUTH_SERVICE}/api/v1/auth/validate-token`,
      phone ,
      {
        headers: {
          Authorization: `${token}`,
        },
      }
    );
  
=======
      "http://localhost:3000/api/v1/auth/validate-token",
      null,
      {
        headers: {
          Authorization: token,
        },
      }
    );
    console.log('validating token...');
    req.user = response.data.username;
>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};
