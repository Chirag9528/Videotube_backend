import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    // create tweet
    const {content} = req.body
    if (!content || content.trim() === ""){
        throw new ApiError(400 , "tweet cannot be empty")
    }
    const tweet = await Tweet.create({
        content : content,
        owner : req.user?._id
    })
    if (!tweet){
        throw new ApiError(500 , "Internal Server Error while creating a tweet")
    }
    return res.status(200)
    .json(
        new ApiResponse(200 , tweet , "tweet created successfully")
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // get user tweets
    const {userId} = req.params
    const isValid = isValidObjectId(userId)
    if (!isValid){
        throw new ApiError(400 , "Invalid User Id")
    }

    const user = await User.findById(userId)
    if (!user){
        throw new ApiError(400 , "User does not exist")
    }

    const tweets = await Tweet.aggregate([
        {
            $match : {
                owner : new mongoose.Types.ObjectId(userId)
            }
        }
    ])

    if (!tweets){
        throw new ApiError(500 , "Error while fetching all tweets")
    }

    return res.status(200)
    .json(
        new ApiResponse(200 , tweets , "All tweets fetched successfully")
    )

})

const updateTweet = asyncHandler(async (req, res) => {
    // update tweet
    const {tweetId} = req.params
    const {content} = req.body
    const isValid = isValidObjectId(tweetId)
    if (!isValid){
        throw new ApiError(400 , "Invalid tweetId")
    }

    const tweet = await Tweet.findById(tweetId)
    if (!tweet){
        throw new ApiError(400 , "Invalid tweetId")
    }
    if (!(tweet.owner).equals(req.user?._id)){
        throw new ApiError(400 , "You can update this tweet as you are not owner of this tweet")
    }

    if (!content || content.trim() === ""){
        throw new ApiError(400 , "Tweet cannot be empty")
    }

    const updatedtweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set : {
                content : content
            }
        },
        {
            new : true
        }
    )

    if (!updatedtweet){
        throw new ApiError(500 , "Error while updating tweet")
    }
    return res.status(200)
    .json(
        new ApiResponse(
        200  , updatedtweet , "tweet updated successfully")
        )
})

const deleteTweet = asyncHandler(async (req, res) => {
    // delete tweet
    const {tweetId} = req.params
    const isValid = isValidObjectId(tweetId)
    if (!isValid){
        throw new ApiError(400 , "Invalid tweetId")
    }

    const tweet = await Tweet.findById(tweetId)
    if (!tweet){
        throw new ApiError(400 , "Invalid tweetId")
    }
    if (!(tweet.owner).equals(req.user?._id)){
        throw new ApiError(400 , "You can delete this tweet as you are not owner of this tweet")
    }

    const deletedtweet = await Tweet.findByIdAndDelete(tweetId)

    if (!deletedtweet){
        throw new ApiError(500 , "Error while deleting tweet")
    }
    return res.status(200)
    .json(
        new ApiResponse(
        200  , deletedtweet , "tweet deleted successfully")
        )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
    }