import Profile from "../models/profile.model.js";

export const getProfiles = async (req, res) => {
    try {
        const users = await Profile.find();
        res.status(200).json({
            status: 'success',
            data: {
                users,
            },
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error',
        });
    }
}
export const getProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await Profile.findById(id).select('-password -__v');
        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found',
            });
        }
        res.status(200).json({
            status: 'success',
            data: {
                user,
            },
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error',
        });
    }
}
export const createProfile = async (req, res, next) => {
    try { 
        const newProfile = await Profile.create([
            {
                ...req.body,
                dateOfBirth: req.body.dateOfBirth,
            }
        ])
        res.status(201).json({
            status: 'success',
            message: 'Profile created successfully',
            data: {
                profile: newProfile,
            },
        });
    } catch (error) {
        next(error);
    }
}
export const updateProfile = async (req, res, next) => {
    try{
        const newProfile = await Profile.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!newProfile) {
            return res.status(404).json({
                status: 'fail',
                message: 'Profile not found',
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Profile updated successfully',
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
        next(error);
        
    }
};
