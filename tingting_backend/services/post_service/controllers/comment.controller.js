import { uploadImage } from "../utils/file.service.js";
import Comment from "../models/comment.model.js";
import Profile from "../models/profile.model.js";

export const getCommentsByPostId = async (req, res) => {
  try {
    const { id } = req.params;
   
    const comments = await Comment.find({ postId: id })
    .populate({
      path: "profileId",
      select: "_id surname firstname avatar", // Chỉ lấy các trường cần thiết
    })
    .lean();
    if (!comments) {
      return res.status(404).json({
        success: false,
        message: "Comments not found",
      });
    }
const formattedComments = comments.map((comment) => {
      const loveReactions = comment.reactions?.love || []; 
      const totalReactions = loveReactions.length;
      const lovedByUser = loveReactions.some(
        (ids) => ids.toString() === comment.profileId._id.toString()
      );

      return {
        _id: comment._id,
        profileId: comment.profileId,
        reactions: comment.reactions,
        content: comment.content,
        media: comment.media,
        replyTo: comment.replyTo,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        postId: comment.postId,
        totalReactions,
        lovedByUser,
         ...comment._doc, 
      };
    });

    res.status(200).json({
      success: true,
      data: {
        comments: formattedComments,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
export const createComment = async (req, res, next) => {
  try {
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

    const newComment = await Comment.create([
      {
        profileId: req.body.profileId,
        content: req.body.content,
        media: req.body.media,
        ...req.body,
      },
    ]);
    res.status(201).json({
      status: "success",
      message: "Comment created successfully",
      data: {
        Comment: newComment,
      },
    });
  } catch (error) {
    next(error);
  }
};
export const updateComment = async (req, res, next) => {
  try {
    const newComment = await Comment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!newComment) {
      return res.status(404).json({
        status: "fail",
        message: "Comment not found",
      });
    }
    res.status(200).json({
      status: "success",
      message: "Comment updated successfully",
      data: {
        Comment: newComment,
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
    console.log("commentId:", id);
    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: "comment not found" });
    const alreadyLoved = comment.reactions?.love?.includes(profileId);

    if (alreadyLoved) {
      comment.reactions.love.pull(profileId);
    } else {
      comment.reactions.love.push(profileId);
    }

    await comment.save();

    res.json({
      message: alreadyLoved ? "Love removed" : "Loved comment",
      loveCount: comment.reactions.love.length,
      lovedByUser: !alreadyLoved,
    });
  } catch (error) {
    console.error("Toggle love error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
