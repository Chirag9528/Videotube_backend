import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Comment } from "../models/comment.model.js"
import { Tweet } from "../models/tweet.model.js"

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
                            localField : "owner",
                            foreignField : "_id",
                            as : "videoowner"
                        }
                    },
                    {
                        $addFields: {
                            author : {
                                $first : "$videoowner.username"
                            },
                            authorfullname : {
                                $first : "$videoowner.fullName"
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
                tit : "$getvideo.title",
                desc : "$getvideo.description",
                vId : "$getvideo.videoFile",
                uname : "$getvideo.author",
                fName : "$getvideo.authorfullname"
            }
        },
        {
            $project : {
                tit : 1 ,
                desc : 1 ,
                vId : 1,
                uname : 1,
                fName : 1
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
    getLikedVideos
    }