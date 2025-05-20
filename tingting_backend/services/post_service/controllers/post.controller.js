import { profile } from "console";
import Post from "../models/post.model.js";
import { uploadImage } from "../utils/file.service.js";

export const getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
    .populate("profileId", "_id surname firstname avatar") // Chỉ lấy trường name và avatar từ profileId
    ;
    res.status(200).json({
      success: true,
      data: {
        posts,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Server error",
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
      const loveReactions = post.reactions?.love || []; // đảm bảo không undefined
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
    const alreadyLoved = post.reactions.love.includes(profileId);

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
