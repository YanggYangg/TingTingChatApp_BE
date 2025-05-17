import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profiles",
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
    privacy: {
      type: String,
      enum: ["public", "friends", "private"],
      default: "public",
    },
    tags: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Profiles",
    },
    reactions: {
      like: { type: Number, default: 0 },
      love: { type: Number, default: 0 },
      haha: { type: Number, default: 0 },
      angry: { type: Number, default: 0 },
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Post = mongoose.model("Posts", postSchema);

export default Post;
