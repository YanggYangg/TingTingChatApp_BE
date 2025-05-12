import { Router } from "express";
import { 
    getPosts,
    getPost,
    createPost,
 } from "../controllers/post.controller.js";


const postRouter = Router();

postRouter.get("/", getPosts);
postRouter.get("/:id", getPost);
postRouter.post("/", createPost);

export default postRouter;
