import { profile } from "console";
import Post from "../models/post.model.js";
import { uploadImage } from "../utils/file.service.js";
import HiddenPost from "../models/hidden_post.model.js";
import FriendRequest from "../models/friendRequest.model.js";

export const getPublicPosts = async (req, res) => {
  try {
    console.log("req.profileId:", req.profileId);
    const userId = req.profileId;
    const friendships = await FriendRequest.find({
      $or: [
        { requester: userId, status: "accepted" },
        { recipient: userId, status: "accepted" },
      ],
    });

    const friendIds = friendships.map(fr =>
      fr.requester.toString() === userId ? fr.recipient : fr.requester
    );

    // 2. Lấy danh sách bài post đã bị ẩn bởi user
    const hiddenPostIds = await HiddenPost.find({ profileId: userId }).distinct("postId");

    // 3. Lấy các bài viết phù hợp
    const posts = await Post.find({
      privacy: "public",
      profileId: { $in: [userId, ...friendIds] },
      _id: { $nin: hiddenPostIds },
    })
      .sort({ createdAt: -1 })
      .populate("profileId", "_id surname firstname avatar");

      const formattedPosts = posts.map((post) => {
      const loveReactions = post.reactions?.love || []; 
      const totalReactions = loveReactions.length;
      const lovedByUser = loveReactions.some(
        (ids) => ids.toString() === userId
      );
    
      return {
        _id: post._id,
        profileId: post.profileId,
        ...post._doc, 
        totalReactions,
        lovedByUser,
      };
    });

    res.status(200).json({
      success: true,
      data: { posts: formattedPosts },
    });
  } catch (error) {
    console.error("Error fetching public posts:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy bài viết công khai",
    });
  }
};

export const getPostByProfileId = async (req, res) => {
  try {
    const { id } = req.params;
    
    const post = await Post.find({ profileId: id });

    
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }
    const formattedPosts = post.map((post) => {
      const loveReactions = post.reactions?.love || []; 
      const totalReactions = loveReactions.length;
      const lovedByUser = loveReactions.some(
        (ids) => ids.toString() === id
      );
    
      return {
        _id: post._id,
        profileId: post.profileId,
        ...post._doc, 
        totalReactions,
        lovedByUser,
      };
    });
    

    res.status(200).json({
      success: true,
      data: {
        post: formattedPosts,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
export const createPost = async (req, res, next) => {
  try {
    console.log("req.body:", req.body);
    if (req.files) {
      const uploads = req.files.map(async (file) => {
        const url = await uploadImage(file);

        // Xác định loại file
        let type = "image";
        if (file.mimetype.startsWith("video/")) {
          type = "video";
        }

        return {
          url,
          type,
          thumbnailUrl: null,
        };
      });

      const media = await Promise.all(uploads);
      req.body.media = media;
    }

    const newPost = await Post.create([
      {
        profileId: req.body.profileId,
        content: req.body.content,
        media: req.body.media,
        ...req.body,
      },
    ]);
    res.status(201).json({
      status: "success",
      message: "Post created successfully",
      data: {
        post: newPost,
      },
    });
  } catch (error) {
    next(error);
  }
};
export const updatePost = async (req, res, next) => {
  try {
    const newPost = await Post.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!newPost) {
      return res.status(404).json({
        status: "fail",
        message: "Post not found",
      });
    }
    res.status(200).json({
      status: "success",
      message: "Post updated successfully",
      data: {
        Post: newPost,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const toggleLoveReaction = async (req, res) => {
  const { id } = req.params;
  const { profileId } = req.body;

  if (!profileId) return res.status(400).json({ message: "Missing profileId" });

  try {
    console.log("postId:", id);
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const alreadyLoved = post.reactions?.love?.includes(profileId);

    if (alreadyLoved) {
      post.reactions.love.pull(profileId);
    } else {
      post.reactions.love.push(profileId);
    }

    await post.save();

    res.json({
      message: alreadyLoved ? "Love removed" : "Loved post",
      loveCount: post.reactions.love.length,
      lovedByUser: !alreadyLoved,
    });
  } catch (error) {
    console.error("Toggle love error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedPost = await Post.findByIdAndDelete(id);

    if (!deletedPost) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
};
export const updatePostPrivacy = async (req, res) => {
  try {
    const { id } = req.params;
    const { privacy } = req.body; 

    if (!["public", "friends", "private"].includes(privacy)) {
      return res.status(400).json({
        success: false,
        message: "Giá trị privacy không hợp lệ. Chỉ nhận: public, friends, private.",
      });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      id,
      { privacy },
      { new: true, runValidators: true }
    );

    if (!updatedPost) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài post.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật quyền riêng tư thành công.",
      data: { post: updatedPost },
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật privacy:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
    });
  }
};
export const hidePost = async (req, res) => {
  try {
    const { profileId, postId, reason } = req.body;

    if (!profileId || !postId) {
      return res.status(400).json({ message: "Missing profileId or postId." });
    }

    const hidden = await HiddenPost.findOneAndUpdate(
      { profileId, postId },
      { reason: reason || "manual", hiddenAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ message: "Post hidden successfully", data: hidden });
  } catch (error) {
    console.error("Error hiding post:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getPostByProfileIdOfOther = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.find({ privacy: "public", profileId: id });

    
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }
    const formattedPosts = post.map((post) => {
      const loveReactions = post.reactions?.love || []; 
      const totalReactions = loveReactions.length;
      const lovedByUser = loveReactions.some(
        (ids) => ids.toString() === id
      );
    
      return {
        _id: post._id,
        profileId: post.profileId,
        ...post._doc, 
        totalReactions,
        lovedByUser,
      };
    });
    

    res.status(200).json({
      success: true,
      data: {
        post: formattedPosts,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};


