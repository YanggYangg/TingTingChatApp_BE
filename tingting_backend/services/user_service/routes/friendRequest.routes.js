import { Router } from "express";
import { sendFriendRequest, 
    respondToFriendRequest,
    getSentRequests,
    getReceivedRequests,
    getFriends,
    cancelFriendRequest,
    unfriend,
    getFriendRequestsForUser,
    checkFriendStatus
}  from "../controllers/friendRequest.controller.js";

const friendRequestRouter = Router();

friendRequestRouter.post("/sendFriendRequest", sendFriendRequest);
friendRequestRouter.post("/respondToFriendRequest", respondToFriendRequest);
friendRequestRouter.get("/getSentRequests/:userId", getSentRequests);
friendRequestRouter.get("/getReceivedRequests/:userId", getReceivedRequests);
friendRequestRouter.get("/getFriends/:userId", getFriends);
friendRequestRouter.post("/cancelFriendRequest", cancelFriendRequest);
friendRequestRouter.post("/unfriend/:requestId", unfriend);
friendRequestRouter.get("/getFriendRequestsForUser/:userId", getFriendRequestsForUser);
friendRequestRouter.post("/checkFriendStatus", checkFriendStatus);

export default friendRequestRouter;