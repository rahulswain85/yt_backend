import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from "../utils/fileUpload.js"
import { ApiResponse } from '../utils/ApiResponse.js'

const registerUser = asyncHandler(async (req, res) => {
    //get user details from frontend
    //validation
    //check if user already exists: using username / email
    //check for images, check for avatar
    //upload them to cloudinary, avatar

    //create user object - create entry in db
    //remove password and refresh token field from response
    //check for user creation
    //return response

    const { username, fullname, email, password } = req.body
    console.log(fullname);

    if ([fullname, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "ALL FIELDS ARE REQUIRED!")
    }

    const existedUser = await User.findOne({$or:[{username},{email}]})

    if (existedUser) {
        throw new ApiError(409, "User Already Exists!")
    }

    console.log();
    

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImagePath = req.files?.coverimage[0]?.path;

    let coverImagePath;

    if (req.files && Array.isArray(req.files.coverimage) && req.files.coverimage.length > 0) {
        coverImagePath = req.files.coverimage[0].path
    }

    if (!avatarLocalPath) throw new ApiError(409, "Avatar file is required!");

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    const coverImage = await uploadOnCloudinary(coverImagePath);
    
    if (!avatar) {
        throw new ApiError(400, "Avatar file is required! ")
    }

    const newUser = await User.create({ fullname, avatar: avatar.url, coverimage: coverImage?.url || "", email, password, username: username.toLowerCase() })

    const createdUser = await User.findById(newUser._id).select(
      "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "Something went wrog while registring the user!")
    }

    return res.status(201).json(new ApiResponse(200, createdUser, "You are registered!", ))



})

export {registerUser}