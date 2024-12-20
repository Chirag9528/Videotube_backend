import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const subscribers = await Subscription.aggregate([
        {
            $match : {
                channel : new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $group : {
                _id : null,
                totalSubscribers : {
                    $sum : 1
                }
            }
        },
        {
            $project : {
                _id : 0 ,
                totalSubscribers : 1
            }
        }
    ])

    if (!subscribers){
        throw new ApiError(500 , "Error while calculating subscribers")
    }

    const likes = await Like.aggregate([
        {
            $lookup : {
                from : "videos",
                localField : "video",
                foreignField : "_id",
                as : "videodetail"
            }
        },
        {
            $lookup : {
                from : "comments",
                localField : "comment",
                foreignField : "_id",
                as : "commentdetail"
            }
        },
        {
            $lookup : {
                from : "tweets",
                localField : "tweet",
                foreignField : "_id",
                as : "tweetdetail"
            }
        },
        {
            $match : {
                $or : [
                    {"videodetail.owner" : req.user?._id}, // $ sign is not used in $match as $match directly checks database
                    {"tweetdetail.owner" : req.user?._id},
                    {"commentdetail.owner" : req.user?._id}
                ]
            }
        },
        {
            $group : {
                _id : 0,
                totalLikes : {$sum : 1}
            }
        },
        {
            $project : {
                _id : 0,
                totalLikes : 1
            }
        }
    ])

    if (!likes){
        throw new ApiError(500 , "Error while calculating likes")
    }

    const videos = await Video.aggregate([
        {
            $match : {
                owner : new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $group : {
                _id : 0,
                totalvideos : {$sum : 1},
                totalviews : {$sum : "$views"}
            }
        },
        {
            $project : {
                _id : 0,
                totalvideos : 1,
                totalviews : 1
            }
        }
    ])

    if (!videos){
        throw new ApiError(500 , "Error while calculating total videos and views")
    }

    const stats = {
        "views" : videos[0]?.totalviews || 0,
        "videos" : videos[0]?.totalvideos || 0,
        "likes" : likes[0].totalLikes,
        "subscribers" : subscribers[0]?.totalSubscribers || 0
    }
    return res.status(200)
    .json(
        new ApiResponse(200 , stats , "ChannelStats fetched successfully")
    )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // Get all the videos uploaded by the channel
    const videoList = await Video.aggregate([
        {
            $match : {
                owner : new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $project : {
                title : 1,
                description : 1,
                videoFile : 1,
                thumbnail : 1,
                views: 1,
                isPublished : 1
            }
        }
    ])
    
    if (!videoList){
        throw new ApiError(500 , "Error while fetching channelVideos")
    }

    return res.status(200)
    .json(
        new ApiResponse(200 , videoList , "Fetched all videos of the channel successfully")
    )
})

export {
    getChannelStats, 
    getChannelVideos
    }