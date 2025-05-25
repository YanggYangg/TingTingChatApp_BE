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
      default: "",
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
          default: "https://lab2s320114581a.s3.ap-southeast-1.amazonaws.com/%20bws1-1747576518127-media_0.png",
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
      love: [{ type: mongoose.Schema.Types.ObjectId, ref: "Profiles" }]
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
