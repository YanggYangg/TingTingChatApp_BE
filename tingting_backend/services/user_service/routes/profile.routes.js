import { Router } from "express";
import { getProfile, 
    getProfiles, 
    createProfile, 
    updateProfile, 
    deleteProfile, 
    uploadImage2,
    getUserPhone
 } from "../controllers/profile.controller.js";
import { authorize } from "../middlewares/auth.middleware.js";
import { upload } from "../utils/aws.helper.js";

const profileRouter = Router();

profileRouter.get("/", getProfiles);
profileRouter.post("/", createProfile);
// profileRouter.get("/:id", authorize, getProfile); 
profileRouter.get("/:id", getProfile); 
profileRouter.post("/:id", authorize , updateProfile);
profileRouter.delete("/:id", authorize, deleteProfile);
profileRouter.post("/upload", authorize, upload, uploadImage2);
profileRouter.get("/getUserPhone/:id", getUserPhone);



export default profileRouter;
