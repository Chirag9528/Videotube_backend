import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    //  toggle subscription
    const isvalid = isValidObjectId(channelId)
    if (!isvalid){
        throw new ApiError(400 , "Invalid channelId")
    }

    const isSubscribed = await Subscription.findOne(
        {subscriber : req.user?._id , channel : channelId}
    )

    if (isSubscribed){
        const subscription = await Subscription.findByIdAndDelete(isSubscribed._id)
        return res.status(200)
        .json(
            new ApiResponse(200 , 
                subscription,
                "Subscription removed successfully"
            )
        )
    }

    const newsubscription = await Subscription.create({
        subscriber : req.user?._id,
        channel : channelId
    })

    return res.status(200)
    .json(
        new ApiResponse(200,
            newsubscription,
            "Subscription added successfully"
        )
    )

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    const isvalid = isValidObjectId(channelId)
    if (!isvalid){
        throw new ApiError(400 , "Invalid channelId")
    }

    const subscribersList = await Subscription.aggregate([
        {
            $match : {
                channel : new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $group: {
                _id: null, // No grouping key; we're combining all results into one group
                subscribers: { $push: "$subscriber" }, // Push all `subscriber` values into a single array
            },
        },
        {
            $project : {
                _id : 0,
                subscribers : 1
            }
        }
    ])

    if (!subscribersList){
        throw new ApiError(500 , "Internal Server Error while getting subscribersList")
    }

    return res.status(200)
    .json(
        new ApiResponse(200 , subscribersList , "Subscriber list fetched successfully")
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    const isvalid = isValidObjectId(subscriberId)
    if (!isvalid){
        throw new ApiError(400 , "Invalid subscriberId")
    }

    const channelsList = await Subscription.aggregate([
        {
            $match : {
                subscriber : new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $group: {
                _id: null, // No grouping key; we're combining all results into one group
                channels: { $push: "$channel" }, // Push all `channel` values into a single array
            },
        },
        {
            $project : {
                _id : 0,
                channels : 1
            }
        }
    ])

    if (!channelsList){
        throw new ApiError(500 , "Internal Server Error while getting channelsList")
    }

    return res.status(200)
    .json(
        new ApiResponse(200 , channelsList , "Channel list fetched successfully")
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
    }