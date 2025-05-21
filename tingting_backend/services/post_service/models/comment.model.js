import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profiles",
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Posts",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    media: [
      {
        url: {
          type: String,
        },
        type: {
          type: String,
          enum: ["image", "video"],
        },
        thumbnailUrl: {
          type: String,
        },
      },
    ],
    replyTo: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Comments",
    },
    reactions: {
      love: [{ type: mongoose.Schema.Types.ObjectId, ref: "Profiles", default: [] }],
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Comment = mongoose.model("Comments", commentSchema);

export default Comment;
