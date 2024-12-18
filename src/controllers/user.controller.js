import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken , refreshToken}

    } catch (error) {
        throw new ApiError(500 , "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler( async (req , res) => {
    const {fullName , email , username , password} = req.body
    // console.log("email: ", email);

    if (
        [fullName , email , username , password].some((field)=> !field || field.trim() === "")
    ){
        throw new ApiError(400 , "All fields are required")
    }

    // find by either username or email
    const existedUser  = await User.findOne({
        $or: [{ username } , { email }]
    })

    if (existedUser){
        throw new ApiError(409 , "User with email or username already exists")
    }

    // multer will add this files
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath){
        throw new ApiError(400 , "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar){
        throw new ApiError(400 , "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar : avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })

    // minus denotes - don't select it
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser){
        throw new ApiError(500 , "Something went wrong while registering a user")
    }

    return res.status(201).json(
        new ApiResponse(200 , createdUser , "User registered Successfully")
    )

} )

const loginUser = asyncHandler(async (req , res) => {
    const {email , username , password} = req.body

    if (!username && !email){
        throw new ApiError(400 , "username or email is required")
    }

    const user = await User.findOne({
        $or: [{username} , {email}]
    })

    if (!user){
        throw new ApiError(404 , "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid){
        throw new ApiError(401 , "Invalid User Credentials")
    }

    const {accessToken , refreshToken} =  await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).
    select("-password -refreshToken")

    const options = { // backend can edit cookie only
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken" , accessToken , options)
    .cookie("refreshToken" , refreshToken , options)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser ,
                accessToken ,
                refreshToken
            },
            "User logged In Successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req , res) => {
    await User.findByIdAndUpdate(
        req.user._id ,
        {
            $unset : {
                refreshToken : 1 // this will remove the field from the document
            }
        },
        {
            new : true
        }
    )   
    const options = { // backend can edit cookie only
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken" , options)
    .clearCookie("refreshToken" , options)
    .json(new ApiResponse(200 , {} , "User Logged Out"))

}) 

const refreshAccessToken = asyncHandler(async(req , res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken){
        throw new ApiError(401 , "unauthorized request")
    }

    try {
        const decodedToken =  jwt.verify(incomingRefreshToken , process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user){
            throw new ApiError(401 , "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401 , "Refresh token is expired or used")
        }
    
        const {accessToken , refreshToken} = await generateAccessAndRefreshTokens(user._id)

        const options = {
            httpOnly : true,
            secure : true
        }
    
        return res
        .status(200)
        .cookie("accessToken" , accessToken , options)
        .cookie("refreshToken" , refreshToken , options)
        .json(
            new ApiResponse(
                200 ,
                {
                    accessToken ,
                    refreshToken : refreshToken
                },
                "Access token refreshed"
            )
        )
    
    } catch (error) {
        throw new ApiError(401 , error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler(async(req , res) => {
    const {oldPassword , newPassword} = req.body
    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect){
        throw new ApiError(400 , "Invalid old password")
    }

    user.password = newPassword;
    await user.save({validateBeforeSave : false})

    return res.status(200)
    .json(new ApiResponse(200 , {} , "Password changed successfully"))

})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res.status(200)
    .json(new ApiResponse(
        200 ,
        req.user ,
        "User fetched successfully"
    ))
})

const updateAccountDetails = asyncHandler(async(req , res) => {
    const {fullName , email} = req.body

    if (!fullName || !email){
        throw new ApiError(400 , "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                fullName,
                email
            }
        },
        {
            new : true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200 , user , "Account details updated successfully"))


})

const updateUserAvatar = asyncHandler(async(req , res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath){
        throw new ApiError(400 , "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    // TODO : Delete old image

    if (!avatar.url){
        throw new ApiError(400 , "Error while uploading Avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                avatar : avatar.url
            }
        },
        {
            new : true
        }
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(200 , user , "Avatar image updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req , res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath){
        throw new ApiError(400 , "CoverImage file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    // TODO: Delete old image

    if (!coverImage.url){
        throw new ApiError(400 , "Error while uploading CoverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                coverImage : coverImage.url
            }
        },
        {
            new : true
        }
    ).select("-password")
    
    return res.status(200)
    .json(
        new ApiResponse(200 , user , "Cover Image updated successfully")
    )
})

const getUserChannelProfile = asyncHandler(async(req , res) => {
    const {username} = req.params

    if (!username?.trim()){
        throw new ApiError(400 , "username is missing")
    }

    // aggregate pipelines
    const channel = await User.aggregate(
        [
            {
                $match : {
                    username : username?.toLowerCase()
                }
            },
            {
                // For finding no of subscribers
                $lookup : {
                    from : "subscriptions",
                    localField : "_id",
                    foreignField : "channel",
                    as : "subscribers" 
                }
            },
            {
                // For finding no of subscribed channel
                $lookup : {
                    from : "subscriptions",
                    localField : "_id",
                    foreignField : "subscriber",
                    as : "subscribedTo"
                }
            },
            {
                $addFields : {
                    // Adding three more fields to user 
                    subscribersCount : {
                        $size : "$subscribers"  // $ indicates that it is a field
                    },
                    channelsSubscribedToCount : {
                        $size : "$subscribedTo"
                    },
                    isSubscribed : {
                        $cond : {
                            if : {$in: [req.user?._id , "$subscribers.subscriber"]},
                            then : true,
                            else : false

                        }
                    }
                }
            },
            {
                $project : {
                    // we want these values only
                    fullName : 1,
                    username : 1,
                    subscribersCount : 1,
                    channelsSubscribedToCount : 1,
                    isSubscribed : 1 ,
                    avatar : 1 ,
                    coverImage : 1,
                    email : 1
                }
            }
        ]
    )

    if (!channel?.length){
        throw new ApiError(404 , "channel does not exists")
    }

    return res.status(200)
    .json(
        new ApiResponse(200 , channel[0] , "User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async(req , res) => {
    const user = await User.aggregate([
        {
            $match : {
                // req.user_id gives us a string so we use mongoose to get mongodb Id of objects
                _id : new mongoose.Types.ObjectId(req.user._id) 
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",
                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner",
                            pipeline : [
                                {
                                    $project : {
                                        fullName : 1,
                                        username : 1,
                                        avatar : 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    return res
    .status(200)
    .json(
        new ApiResponse(
            200 , 
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    changeCurrentPassword,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}
