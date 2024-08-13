import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandlers.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";


const generateAccessTokenandRefreshToken = async(userId) => {
    try {

        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken    
        await user.save({ValidateBeforeSave: false})

        return{accessToken,refreshToken}


        
    } catch (error) {
        throw new ApiError(500,"something went wrong while generating refresh and access token")
    }

}

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
    

    if(
        [fullname,email,username,password].some((field) =>
            field?.trim() === ""
        )
    )
    {
        throw new ApiError(400,"All fields are reqired")
    }

    const existedUser = await User.findOne({
        $or: [{ username },{ email }]
    })
    

    if(existedUser) {
        throw new ApiError(409, "User with email or password already exists")
    }
    console.log(req.files)
    const avatarLocalPath = req.files?.avatar[0]?.path;
   // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(Array.isArray(req.files.coverImage) && req.files && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
   

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")

    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    let coverImage;
    if(coverImageLocalPath) {
       coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }
    
 
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

const loginUser = asyncHandler(async(req,res) => {
    //req.body -> data
    //username or email
    // find the user
    // password check
    // access and refresh token
    // send cookie
    const {email,username,password} = req.body
    console.log(req.body);
    if(!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
    const user = await User.findOne({
        $or: [{email},{username}]
    })
    
    if(!user) {
        throw new ApiError(401, "User does not exist")
    }

    const isPassword = await user.isPasswordCorrect(password)

    if(!isPassword) {
        throw new ApiError(401, "invalid user credentials")
    }

    const {accessToken,refreshToken} = await generateAccessTokenandRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken 
            },
            "User logged In successfully"
        )
    )

    
})

const logoutUser = asyncHandler(async(req,res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $set: {
            refreshToken: undefined
        }
    },
    {
        new: true
    }

)
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200,{},"User logged out"))

})

const refreshAccessToken = asyncHandler(async(req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken) {
        throw new ApiError(401,"unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken._id)

        if(!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
        if(incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token expired or used")
        }
        const {accessToken, newRefreshToken} = await generateAccessTokenandRefreshToken(user._id)

        const options = {
            httpOnly: true,
            secure: true
        }

        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .josn(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access Token Refreshed"
            )
        )
    } catch (error) {
        
    }

})
export {registerUser,loginUser,logoutUser, refreshAccessToken}