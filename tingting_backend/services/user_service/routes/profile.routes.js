import { Router } from "express";
import { getProfile, getProfiles, createProfile, updateProfile, deleteProfile  } from "../controllers/profile.controller.js";
import { authorize } from "../middlewares/auth.middleware.js";

const profileRouter = Router();

profileRouter.get("/", getProfiles);
profileRouter.post("/", createProfile);
profileRouter.get("/:id", authorize, getProfile);
profileRouter.put("/:id", authorize, updateProfile);
profileRouter.delete("/:id", authorize, deleteProfile);

export default profileRouter;
