import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAll = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, sortBy, sortType , query} = req.query
    //  get all videos based on query, sort, pagination
    const videos = await Video.aggregate([
        {
            $match : {
                $or: [
                    {title : {$regex : query , $options:"i"}},
                    {description : {$regex :  query , $options:"i"}}
                    ]
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField: "_id",
                as: "createdBy"
            }
        },
        {
            $unwind : "$createdBy"
        },
        {
            $addFields : {
                ownername : "$createdBy.username",
                avatar : "$createdBy.avatar"
            }
        },
        {
            $project : {
                thumbnail : 1,
                videoFile : 1,
                title: 1,
                description : 1,
                ownername : 1,
                owner : 1,
                avatar : 1,
                views : 1,
                isPublished : 1
            }
        },
        {
            $sort : {
                [sortBy]:sortType === 'asc' ? 1 : -1
            }
        },
        {
            $skip : (page-1)*limit
        },
        {
            $limit : parseInt(limit)
        }
    ])

    return res.status(200)
    .json(new ApiResponse(200 , 
        videos,
        "Videos Fetched Successfully"
    ))
})


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //  get all videos based on query, sort, pagination
    const videos = await Video.aggregate([
        {
            $match : {
                $and : [
                    {
                        $or: [{title : {$regex : query , $options:"i"}},
                        {description : {$regex :  query , $options:"i"}}
                        ]
                    },
                    {
                        owner : new mongoose.Types.ObjectId(userId)
                    }
                ]
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField: "_id",
                as: "createdBy"
            }
        },
        {
            $unwind : "$createdBy"
        },
        {
            $addFields : {
                ownername : "$createdBy.username",
                avatar : "$createdBy.avatar"
            }
        },
        {
            $project : {
                thumbnail : 1,
                videoFile : 1,
                title: 1,
                description : 1,
                ownername : 1,
                owner : 1,
                avatar : 1,
                views : 1,
                isPublished : 1
            }
        },
        {
            $sort : {
                [sortBy]:sortType === 'asc' ? 1 : -1
            }
        },
        {
            $skip : (page-1)*limit
        },
        {
            $limit : parseInt(limit)
        }
    ])

    return res.status(200)
    .json(new ApiResponse(200 , 
        videos,
        "Videos Fetched Successfully"
    ))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // get video, upload to cloudinary, create video

    if (!title || !description){
        throw new ApiError(400 , "title and description are required")
    }

    const user = await User.findById(req.user?._id)
    if (!user){
        throw new ApiError(500 , "Internal Server Error while fetching user")
    }

    const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
    if (!videoFileLocalPath){
        throw new ApiError(400 , "videoFile is required")
    }

    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
    if (!thumbnailLocalPath){
        throw new ApiError(400 , "thumbnail is required")
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    if (!videoFile){
        throw new ApiError(500 , "Internal Server Error , Error while uploading videoFile to the Cloudinary")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if (!thumbnail){
        throw new ApiError(500 , "Internal Server Error , Error while uploading thumbnail to the Cloudinary")
    }

    const video = await Video.create({
        videoFile : videoFile.url,
        thumbnail : thumbnail.url,
        owner : user._id,
        title,
        description,
        duration : videoFile.duration,
        views : 0,
        isPublished : true,
    })

    if (!video){
        throw new ApiError(500 , "Internal Server Error while Publishing Video")
    }
    
    return res.status(200)
    .json(
        new ApiResponse(200 , video , "Video Published Successfully")
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    // get video by id
    if (!videoId){
        throw new ApiError(400 , "videoId is required")
    }
    const isvalid = isValidObjectId(videoId)
    if (!isvalid){
        throw new ApiError(400 , "videoId is Invalid")
    }
    const video = await Video.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "ownerdetails"
            }
        },
        {
            $unwind : "$ownerdetails"
        },
        {
            $addFields : {
                ownername : "$ownerdetails.username",
                avatar  : "$ownerdetails.avatar"
            }
        },
        {
            $project : {
                _id  : 1,
                videoFile : 1,
                thumbnail : 1,
                title : 1,
                description : 1,
                duration : 1,
                views : 1,
                isPublished : 1,
                owner : 1,
                ownername : 1,
                avatar : 1
            }
        }
    ])

    if (!video){
        throw new ApiError(400 , "this video does not exists")
    }

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            video[0],
            "video fetched successfully"
        )
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    // update video details like title, description, thumbnail
    if (!videoId){
        throw new ApiError(400 , "videoId is required")
    }

    const isvalid = isValidObjectId(videoId)
    if (!isvalid){
        throw new ApiError(400 , "videoId is Invalid")
    }

    const video = await Video.findById(videoId)
    if (!video){
        throw new ApiError(500 , "Internal Server Error")
    }

    if (!(video.owner).equals(req.user?._id)){
        throw new ApiError(400 , "You cannot update this video as you are not owner of this video")
    }

    const thumbnailLocalPath = req.file?.path;
    if (!thumbnailLocalPath){
        throw new ApiError(400 , "thumbnail is required")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if (!thumbnail){
        throw new ApiError(500 , "Internal Server Error , Error while uploading thumbnail to the Cloudinary")
    }    

    const {title , description} = req.body
    if (
        [title , description].some((field) => !field || field.trim() === "")
    ){
        throw new ApiError(400 , "All fields are required")
    }

    const videoafterupdate = await Video.findByIdAndUpdate(
        videoId,
        {
            $set : {
                title,
                description,
                thumbnail : thumbnail.url
            }
        },
        {
            new : true
        }
    )
    return res.status(200)
    .json(
        new ApiResponse(200 , 
            videoafterupdate ,
            "video updated successfully"
        )
    )
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    // delete video
    if (!videoId){
        throw new ApiError(400 , "videoId is required")
    }

    const isvalid = isValidObjectId(videoId)
    if (!isvalid){
        throw new ApiError(400 , "videoId is Invalid")
    }

    const video = await Video.findById(videoId)
    if (!video){
        throw new ApiError(500 , "this video does not exists")
    }

    if (!(video.owner).equals(req.user?._id)){
        throw new ApiError(400 , "You cannot delete this video as you are not owner of this video")
    }

    const deletedVideo = await Video.findByIdAndDelete(videoId)

    return res.status(200)
    .json(
        new ApiResponse(200,
            deletedVideo ,
            "video deleted successfully"
        )
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!videoId){
        throw new ApiError(400 , "videoId is required")
    }

    const isvalid = isValidObjectId(videoId)
    if (!isvalid){
        throw new ApiError(400 , "videoId is Invalid")
    }

    const video = await Video.findById(videoId)
    if (!video){
        throw new ApiError(400 , "this video does not exists")
    }

    if (!(video.owner).equals(req.user?._id)){
        throw new ApiError(404 , "You cannot update this video as you are not owner of this video")
    }

    const changedvideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set : {
                isPublished : !video.isPublished
            }
        },
        {
            new : true
        }
    )

    return res.status(200)
    .json(
        new ApiResponse(200 , changedvideo , "IsPublished Toggled successfully")
    )
})

const updateviews = asyncHandler(async (req , res)=>{
    const {videoId} = req.params
    if (!videoId){
        throw new ApiError(400 , "videoId is required")
    }

    const isvalid = isValidObjectId(videoId)
    if (!isvalid){
        throw new ApiError(400 , "videoId is Invalid")
    }

    const video = await Video.findById(videoId)
    if (!video){
        throw new ApiError(400 , "this video does not exists")
    }

    const videoafterupdate = await Video.findByIdAndUpdate(
        videoId , 
        {
            $set : {
                views : video.views+1
            }
        },
        {
            new : true
        }
    )
    return res.status(200)
    .json(
        new ApiResponse(200 , videoafterupdate , "Views updated successfully")
    )

})

export {
    getAll,
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    updateviews
    }