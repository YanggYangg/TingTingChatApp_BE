import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minLength: 1,
      maxLength: 20,
    },
    surname: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minLength: 1,
      maxLength: 20,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      unique: [true, "Email already exists"],
    
      lowercase: true,
      match: [/\S+@\S+\.\S+/, "Please enter a valid email address"],
    },
    gender: {
      type: String,
      require: [true, "Gender is required"],
    },
    dateOfBirth: {
      type: Date,
      require: [true, "Date of birth is required"],
    },
  },
  { timestamps: true }
);

const Profile = mongoose.model("Profiles", profileSchema);

export default Profile;
