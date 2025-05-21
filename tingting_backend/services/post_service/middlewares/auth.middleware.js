import axios from "axios";
import { PORT_AUTH_SERVICE } from "../config/env.js";
import { JWT_SECRET } from "../config/env.js";
import jwt from "jsonwebtoken";
import { console } from "inspector";

export const authorize = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Không có token hợp lệ" });
  }

  const token = authHeader.split(" ")[1]; // ✅ Lấy phần sau "Bearer"

  try {
    const decoded = jwt.verify(token, JWT_SECRET); // ✅ đúng định dạng
    const phone = decoded?.claims?.phone;
    console.log("phone: ", phone);

    const response = await axios.post(
      `http://localhost:${PORT_AUTH_SERVICE}/api/v1/auth/validate-token`,
      { phone },
      {
        headers: {
          Authorization: `Bearer ${token}`, // nên giữ lại prefix khi gửi sang Auth Service
        },
      }
    );

    const profileId = decoded?.claims?.profileId;
    if (!profileId) {
      return res
        .status(401)
        .json({ message: "Token không hợp lệ (không có profileId)" });
    }

    req.profileId = profileId;
    next();
  } catch (err) {
    console.error("Token verify failed:", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
};
