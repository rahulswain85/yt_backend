import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from "../utils/fileUpload.js"
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt  from 'jsonwebtoken'
const generateAccessAndRefereshTokens = async(userId)=>{
    try {

        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })
        
        return {accessToken, refreshToken}
        
    }
    catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token!")
    }
}

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


const loginUser = asyncHandler(async (req, res) => {
    //req.body -> data
    //username or email
    //find the user
    //password check
    //access and refresh token
    //send cookies
    console.log(req.body);
    const { email, username, password } = req.body;
    
    

    if (!(username || email)) {
        throw new ApiError(400, 'Username or email required!');
    }

    const user = await User.findOne({ $or: [{ email }, { username }] });

    if (!user) {
        throw new ApiError(404, "User Does Not Exists!")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(404, "Invalid user credentials!");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);
    
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200).
        cookie("accessToken", accessToken, options).
        cookie("refreshToken", refreshToken, options).json(
            new ApiResponse(200, {
                user: loggedInUser, accessToken,
                refreshToken
            }, "User logged in successfully!")
        );


});


const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $set: {refreshToken: undefined}
    }, {
        new: true
    }); 

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options)
        .json(
        new ApiResponse(200, {}, "User logged Out!")
    )
})


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookie?.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Request!");
    }

    try {
        const decodedToken = jwt.verify(
          incomingRefreshToken,
          process.env.REFRESH_TOKEN_SECRET
        );
    
        const user = User.findById(decodedToken?._id);
    
        if (!user) {
          throw new ApiError(401, "Invalid Refresh Token!");
        }
    
        if (user.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Refresh token is expired or used!");
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const { accessToken, newRefreshToken } = await generateAccessAndRefereshTokens(user._id)
    
        return res.status(200)
        .cookie("accessToken", accessToken, options)
            .cookie("redreshToken", newRefreshToken, options)
            .json(new ApiResponse(
                200,
                { accessToken, refreshToken: newRefreshToken },
                "Access Token Refreshed!"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token!" )
    }
})


const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user?._id);

    const validatePassword = await user.isPasswordCorrect(oldPassword);

    if (!validatePassword) {
        throw new ApiError(400, "Invalid old password!");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200,{},"Password changed successfully!"))
})

const getCurrentUser = asyncHandler(
    async (req, res) => {
        return res
            .status(200)
            .json(new ApiResponse(200, req.user, "Current user frtched successfully"));
    }
)

const updateAccountDetails = asyncHandler(
    async (req, res) => {
        const { fullName, email } = req.body;

        if (!fullName || !email) {
            throw new ApiError(400, "All fields are required")
        }

        const user = await User.findByIdAndUpdate(req.user?._id,
            {
                $set: {
                    fullName,
                    email    
            }},
            {new: true}
        ).select('-password')

        return res.status(200)
        .json(new ApiResponse(200, user, "Account details updates successfully!"))


    }
)

const updateAvatar = asyncHandler(
    async (req, res) => {
        const avatarLocalPath = req.file?.path;

        if (!avatarLocalPath) {
            throw new ApiError(400, "Avatar file is missing");
        }

        const avatar = await uploadOnCloudinary(avatarLocalPath);

        if (!avatar) {
            throw new ApiError(400, "Error while uploading the avatar!");
        }

        const user = await User.findByIdAndUpdate(req.user?._id, { $set: { avatar: avatar.url } }, { new: true }).select("-password");

        return res.status(200).json(new ApiResponse(200, user, "Avatar Updated!"));
    }
)

const updateCover = asyncHandler(async (req, res) => {
  const coverLocalPath = req.file?.path;

  if (!coverLocalPath) {
    throw new ApiError(400, "Cover file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverLocalPath);

  if (!coverImage) {
    throw new ApiError(400, "Error while uploading the avatar!");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverimage: coverImage.url } },
    { new: true }
    ).select("-password");
    
    return res.status(200).json(new ApiResponse(200, user, "Cover Image Updated!"));
});



export {
    registerUser, 
    loginUser,
    logoutUser,
    refreshAccessToken,
    updateAvatar,
    updateCover,
    getCurrentUser,
    updateAccountDetails,
    changeCurrentPassword
}