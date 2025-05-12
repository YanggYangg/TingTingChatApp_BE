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
    const post = await Post.findById(id).select("-password -__v");
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
    const newPost = await Post.create([
      {
        content: req.body.content,
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
    
    const newPost = await Post.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
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
