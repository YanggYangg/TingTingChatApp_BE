import { profile } from "console";
import Post from "../models/post.model.js";
import { uploadImage } from "../utils/file.service.js";

export const getPosts = async (req, res) => {
  try {
    const posts = await Post.find();
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
export const getPost = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("id:", id);
    const post = await Post.find({ profileId: id });
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }
    res.status(200).json({
      success: true,
      data: {
        post,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Server error",
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
