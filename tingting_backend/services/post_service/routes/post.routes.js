import { Router } from "express";
import { 
    getPublicPosts,
    getPostByProfileId,
    createPost,
    toggleLoveReaction,
    deletePost,
    updatePostPrivacy,
    hidePost
 } from "../controllers/post.controller.js";
import { upload } from "../utils/aws.helper.js";
import { authorize } from "../middlewares/auth.middleware.js";


const postRouter = Router();

postRouter.get("/", authorize , getPublicPosts);
postRouter.get("/:id", getPostByProfileId);
postRouter.post("/:id/love", toggleLoveReaction);
postRouter.post("/", upload, createPost);
postRouter.delete("/:id", deletePost);
postRouter.put("/:id/privacy", updatePostPrivacy);
postRouter.post("/hide", hidePost);

export default postRouter;
