import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Comment } from "../models/comment.model.js"
import { Tweet } from "../models/tweet.model.js"

const checkVideoLike = asyncHandler(async (req , res) => {
    const {videoId} = req.params
    const isValid = isValidObjectId(videoId)
    if (!isValid){
        throw new ApiError(400 , "Invalid videoId")
    }
    const video = await Video.findById(videoId)
    if (!video){
        throw new ApiError(400 , "Invalid videoId")
    }
    const findlike = await Like.findOne({video : videoId , likedBy : req.user?._id})
    if (findlike){
        return res.status(200)
        .json(
            new ApiResponse(200 , true , "You have liked this video")
        )
    }
    return res.status(200)
    .json(
        new ApiResponse(200 , false , "You haven't liked this video")
    )
})

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    // toggle like on video
    const isValid = isValidObjectId(videoId)
    if (!isValid){
        throw new ApiError(400 , "Invalid videoId")
    }

    const video = await Video.findById(videoId)
    if (!video){
        throw new ApiError(400 , "Invalid videoId")
    }

    const findlike = await Like.findOne({video : videoId , likedBy : req.user?._id})
    if (findlike){
        const unlike = await Like.findByIdAndDelete(findlike._id)
        if (!unlike){
            throw new ApiError(500 , "Error while removing like")
        }
        return res.status(200)
        .json(
            new ApiResponse(200 , unlike , "video unliked successfully")
        )
    }

    const liked = await Like.create({
        video : videoId,
        likedBy : req.user?._id
    })

    if (!liked){
        throw new ApiError(500 , "Error while adding like")
    }
    return res.status(200)
    .json(
        new ApiResponse(200 , liked , "video liked successfully")
    )

})

const checkCommentLike = asyncHandler(async (req , res) => {
    const {commentId} = req.params
    const isValid = isValidObjectId(commentId)
    if (!isValid){
        throw new ApiError(400 , "Invalid commentId")
    }
    const comment = await Comment.findById(commentId)
    if (!comment){
        throw new ApiError(400 , "Invalid commentId")
    }
    const findlike = await Like.findOne({comment : commentId , likedBy : req.user?._id})
    if (findlike){
        return res.status(200)
        .json(
            new ApiResponse(200 , true , "You have liked this comment")
        )
    }
    return res.status(200)
    .json(
        new ApiResponse(200 , false , "You haven't liked this comment")
    )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    // toggle like on comment
    const isValid = isValidObjectId(commentId)
    if (!isValid){
        throw new ApiError(400 , "Invalid commentId")
    }

    const comment = await Comment.findById(commentId)
    if (!comment){
        throw new ApiError(400 , "Invalid commentId")
    }

    const findlike = await Like.findOne({comment : commentId , likedBy : req.user?._id})
    if (findlike){
        const unlike = await Like.findByIdAndDelete(findlike._id)
        if (!unlike){
            throw new ApiError(500 , "Error while removing like")
        }
        return res.status(200)
        .json(
            new ApiResponse(200 , unlike , "comment unliked successfully")
        )
    }

    const liked = await Like.create({
        comment : commentId,
        likedBy : req.user?._id
    })

    if (!liked){
        throw new ApiError(500 , "Error while adding like")
    }
    return res.status(200)
    .json(
        new ApiResponse(200 , liked , "comment liked successfully")
    )

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    // toggle like on tweet
    const isValid = isValidObjectId(tweetId)
    if (!isValid){
        throw new ApiError(400 , "Invalid tweetId")
    }

    const tweet = await Tweet.findById(tweetId)
    if (!tweet){
        throw new ApiError(400 , "Invalid tweetId")
    }

    const findlike = await Like.findOne({tweet : tweetId , likedBy : req.user?._id})
    if (findlike){
        const unlike = await Like.findByIdAndDelete(findlike._id)
        if (!unlike){
            throw new ApiError(500 , "Error while removing like")
        }
        return res.status(200)
        .json(
            new ApiResponse(200 , unlike , "tweet unliked successfully")
        )
    }

    const liked = await Like.create({
        tweet : tweetId,
        likedBy : req.user?._id
    })

    if (!liked){
        throw new ApiError(500 , "Error while adding like")
    }
    return res.status(200)
    .json(
        new ApiResponse(200 , liked , "tweet liked successfully")
    )
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    // get all liked videos
    const videoList = await Like.aggregate([
        {
            $match : {
                likedBy : req.user?._id
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "video",
                foreignField : "_id",
                as : "getvideo",
                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner", // will respect to videos
                            foreignField : "_id",
                            as : "videoowner"
                        }
                    },
                    {
                        $addFields: {
                            // adding field to getvideos
                            author : {
                                $first : "$videoowner.username" // extracting first element from username array
                            },
                            avatar : {
                                $first : "$videoowner.avatar"
                            }
                        }
                    }
                ]
            }
        },
        {
            $unwind : "$getvideo"
        },
        {
            $addFields : {
                videoid : "$getvideo._id",
                title : "$getvideo.title",
                description : "$getvideo.description",
                videoFile : "$getvideo.videoFile",
                thumbnail : "$getvideo.thumbnail",
                ownername : "$getvideo.author",
                avatar : "$getvideo.avatar",
                owner : "$getvideo.owner",
                views : "$getvideo.views",
                isPublished : "$getvideo.isPublished",
            }
        },
        {
            $project : {
                // need these fields only
                _id : 1 ,
                videoid : 1,
                title : 1 ,
                description : 1 ,
                videoFile : 1,
                thumbnail : 1,
                ownername : 1,
                owner : 1,
                avatar : 1,
                views : 1,
                isPublished : 1
            }
        }
    ])

    if (!videoList){
        throw new ApiError(500 , "Error while fetching Likedvideos")
    }
    return res.status(200)
    .json(
        new ApiResponse(200 , videoList , "Liked videoList fetched successfully")
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos,
    checkVideoLike,
    checkCommentLike
    }