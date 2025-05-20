import { Router } from "express";

import { upload } from "../utils/aws.helper.js";
import { createComment, getCommentsByPostId } from "../controllers/comment.controller.js";


const commnentRouter = Router();

commnentRouter.get("/:id", getCommentsByPostId );
commnentRouter.post("/", upload, createComment );

export default commnentRouter;
