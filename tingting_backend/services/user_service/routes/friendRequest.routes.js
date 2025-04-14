import { Router } from "express";
import { sendFriendRequest, 
    respondToFriendRequest,
    getSentRequests,
    getReceivedRequests
}  from "../controllers/friendRequest.controller.js";

const friendRequestRouter = Router();

friendRequestRouter.post("/sendFriendRequest", sendFriendRequest);
friendRequestRouter.post("/respondToFriendRequest", respondToFriendRequest);
friendRequestRouter.get("/getSentRequests/:userId", getSentRequests);
friendRequestRouter.get("/getReceivedRequests/:userId", getReceivedRequests);

export default friendRequestRouter;