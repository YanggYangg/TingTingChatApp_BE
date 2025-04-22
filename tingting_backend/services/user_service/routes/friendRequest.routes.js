import { Router } from "express";
import { sendFriendRequest, 
    respondToFriendRequest,
    getSentRequests,
    getReceivedRequests,
    getFriends,
    cancelFriendRequest,
    unfriend,
    getFriendRequestsForUser,
    checkFriendStatus,
    getFriendsList,
    getSentPendingRequests
}  from "../controllers/friendRequest.controller.js";

const friendRequestRouter = Router();

friendRequestRouter.post("/sendFriendRequest", sendFriendRequest);
friendRequestRouter.post("/respondToFriendRequest", respondToFriendRequest);
friendRequestRouter.get("/getSentRequests/:userId", getSentRequests);
friendRequestRouter.get("/getReceivedRequests/:userId", getReceivedRequests);
friendRequestRouter.get("/getFriends/:userId", getFriends);
friendRequestRouter.post("/cancelFriendRequest", cancelFriendRequest);
friendRequestRouter.post("/unfriend", unfriend);
friendRequestRouter.get("/getFriendRequestsForUser/:userId", getFriendRequestsForUser);
friendRequestRouter.post("/checkFriendStatus", checkFriendStatus);
friendRequestRouter.get("/getFriendsLists/:userId", getFriendsList);
friendRequestRouter.get("/getSentPendingRequests/:userId", getSentPendingRequests);

export default friendRequestRouter;