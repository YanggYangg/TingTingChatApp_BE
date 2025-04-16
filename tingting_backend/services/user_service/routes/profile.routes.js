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
<<<<<<< HEAD
// profileRouter.get("/:id", authorize, getProfile); 
profileRouter.get("/:id", getProfile); 
profileRouter.post("/:id", authorize , updateProfile);
profileRouter.delete("/:id", authorize, deleteProfile);
profileRouter.put("/upload", authorize, upload, uploadImage2 );
=======
profileRouter.get("/:id", authorize, getProfile); 
profileRouter.post("/:id", authorize , updateProfile);
profileRouter.delete("/:id", authorize, deleteProfile);
profileRouter.post("/upload", authorize, upload, uploadImage2);
>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6
profileRouter.get("/getUserPhone/:id", getUserPhone);



export default profileRouter;
