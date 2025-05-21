import mongoose from "mongoose";

const hiddenPostSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profiles",
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    reason: {
      type: String,
      enum: ["manual", "reported"],
      default: "manual",
    },
    hiddenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, 
  }
);


hiddenPostSchema.index({ profileId: 1, postId: 1 }, { unique: true });
const HiddenPost = mongoose.model("HiddenPost", hiddenPostSchema);
export default HiddenPost;
