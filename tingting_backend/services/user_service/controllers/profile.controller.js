import Profile from "../models/profile.model.js";
// import { uploadImage } from "../utils/file.service.js";

export const getProfiles = async (req, res) => {
  try {
    const users = await Profile.find();
    //console.log("All USERS: ", users);
    res.status(200).json({
      status: "success",
      data: {
        users,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
};
export const getProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await Profile.findById(id).select("-password -__v");
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }
    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
};
export const createProfile = async (req, res, next) => {
  try {
    const { day, month, year } = req.body;
    const dateOfBirth = new Date(Date.UTC(year, month - 1, day));
    console.log(dateOfBirth);
    const newProfile = await Profile.create([
      {
        ...req.body,
        dateOfBirth: dateOfBirth,
      },
    ]);
    res.status(201).json({
      status: "success",
      message: "Profile created successfully",
      data: {
        profile: newProfile,
      },
    });
  } catch (error) {
    next(error);
  }
};
export const updateProfile = async (req, res, next) => {
  try {
 
    const { day, month, year } = req.body;
    console.log(day, month, year);

    const dateOfBirth = new Date(Date.UTC(year, month - 1, day));
    console.log(dateOfBirth);
    const newProfile = await Profile.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    await Profile.findByIdAndUpdate(req.params.id, {
      dateOfBirth: dateOfBirth
    });
    if (!newProfile) {
      return res.status(404).json({
        status: "fail",
        message: "Profile not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      data: {
        profile: newProfile,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProfile = async (req, res, next) => {
    try {
        await Profile.findByIdAndDelete(req.params.id);
        res.status(200).json({
            status: 'success',
            message: 'Profile deleted successfully',
        });
    } catch (error) {
        next(error)

    }
};

export const uploadImage2 = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: "fail",
        message: "No file uploaded",
      });
    }
    const fileUrl = await uploadImage(req.file);
    console.log("file = ", fileUrl);

    res.status(200).json({
      status: "success",
      message: "File uploaded successfully",
      data: {
        fileUrl,
      },
    });
  } catch (error) {
    next(error);
  }
}

export const getUserPhone = async (req, res) => {
  try{
    const userId = req.params.id;
    const user = await Profile.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
      phone: user.phone, 
    });
  }catch (error) {
    res.status(500).json({ message: error.message });
  }

};


