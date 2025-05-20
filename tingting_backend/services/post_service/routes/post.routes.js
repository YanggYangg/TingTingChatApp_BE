import { Router } from "express";
import { 
    getPosts,
    getPostByProfileId,
    createPost,
    toggleLoveReaction,
 } from "../controllers/post.controller.js";
import { upload } from "../utils/aws.helper.js";


const postRouter = Router();

postRouter.get("/", getPosts);
postRouter.get("/:id", getPostByProfileId);
postRouter.post("/:id/love", toggleLoveReaction);
postRouter.post("/", upload, createPost);

export default postRouter;
