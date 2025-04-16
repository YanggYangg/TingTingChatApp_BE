import axios from "axios";
import { PORT_AUTH_SERVICE} from "../config/env.js";

export const authorize = async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "No token" });
 
  try {
    const response = await axios.post(
      `http://localhost:${PORT_AUTH_SERVICE}/api/v1/auth/validate-token`,
      null,
      {
        headers: {
          Authorization: token,
        },
      }
    );
    console.log('validating token...');
    req.user = response.data.username;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};
