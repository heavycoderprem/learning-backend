import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandlers.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async(req,res) => {
    // get user details from fromtend
    //verify the details
    // check if the user already exists
    //check for avatar and cover image they are requried
    // upload them to cloudinary
    //create user object- create entry in db
    //remove password & refresh token field from response
    //check for user creation
    //return res

    const {fullname,email,username,password} = req.body
    console.log("email: ", email);

    if(
        [fullname,email,username,password].some((field) =>
            field.trim() === ""
        )
    )
    {
        throw new ApiError(400,"All fields are reqired")
    }

    const existedUser = User.findOne({
        $or: [{ username },{ email }]
    })

    if(existedUser) {
        throw new ApiError(409, "User with email or password already exists")
    }

    const avatarLocalPath = req.files?.avatar[0].path;
    const coverImageLocalPath = req.files?.coverImage[0].path;

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")

    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
 
    if(!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser) {
        throw new ApiError(500,"something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered successfully")
    )

})

export {registerUser}