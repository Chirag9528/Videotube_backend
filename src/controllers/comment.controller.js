import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import { Video } from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    // get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    const isValid = isValidObjectId(videoId)
    if (!isValid){
        throw new ApiError(400 , "Invalid VideoId")
    }

    const commentsList = await Comment.aggregate([
        {
            $match : {
                video : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "commentby"
            }
        },
        {
            $unwind : "$commentby"
        },
        {
            $project : {
                content : 1 ,
                commentby : {
                    username : 1,
                    fullName : 1,
                    email : 1
                }
            }
        },
        {
            $skip : (page-1)*limit
        },
        {
            $limit : parseInt(limit)
        }
    ])

    if (!commentsList){
        throw new ApiError(400 , "Error while getting comment List")
    }

    return res.status(200)
    .json(
        new ApiResponse(200 , commentsList , "All comments fetched successfully")
    )

})

const addComment = asyncHandler(async (req, res) => {
    // add a comment to a video
    const {videoId} = req.params
    const {message} = req.body
    const isValid = isValidObjectId(videoId)
    if (!isValid){
        throw new ApiError(400 , "Invalid VideoId")
    }

    const video = await Video.findById(videoId)
    if (!video){
        throw new ApiError(400 , "Invalid VideoId")
    }

    if (!message || message.trim() === ""){
        throw new ApiError(400 , "message cannot be empty")
    }

    const comment = await Comment.create({
        video : videoId,
        content : message ,
        owner : req.user?._id
    })

    const newcomment = await Comment.findById(comment._id)

    if (!newcomment){
        throw new ApiError(500 , "Error while adding comment")
    }

    return res.status(200)
    .json(
        new ApiResponse(200 , comment , "Comment Added Successfully")
    )

})

const updateComment = asyncHandler(async (req, res) => {
    // update a comment
    const {commentId} = req.params
    const {newmessage} = req.body
    const isValid = isValidObjectId(commentId)
    if (!isValid){
        throw new ApiError(400 , "Invalid Comment Id")
    }

    if (!newmessage ||  newmessage.trim() === ""){
        throw new ApiError(400 , "message cannot be empty")
    }

    const comment = await Comment.findById(commentId)
    if (!comment){
        throw new ApiError(400 , "Invalid Comment Id")
    }

    if (!(comment?.owner).equals(req.user?._id)){
        throw new ApiError(400 , "You cannot update the comment as you are not the owner of this comment")
    }

    const newcomment = await Comment.findByIdAndUpdate(
        commentId ,
        {
            $set : {
                content :  newmessage
            }
        },
        {
            new : true
        }
    )

    const updatedComment = await Comment.findById(newcomment._id)
    if (!updatedComment){
        throw new ApiError(500 , "Error while updating comment")
    }

    return res.status(200)
    .json(
        new ApiResponse(200 , updatedComment , "comment updated successfully")
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    // delete a comment
    const {commentId} = req.params
    const isValid = isValidObjectId(commentId)
    if (!isValid){
        throw new ApiError(400 , "Invalid Comment Id")
    }

    const comment = await Comment.findById(commentId)
    if (!comment){
        throw new ApiError(400 , "Invalid Comment Id")
    }

    if (!(comment?.owner).equals(req.user?._id)){
        throw new ApiError(400 , "You cannot delete the comment as you are not the owner of this comment")
    }

    const deletedComment = await Comment.findByIdAndDelete(comment._id)
    if (!deleteComment){
        throw new ApiError(500 , "Error while deleting comment")
    }

    return res.status(200)
    .json(
        new ApiResponse(200 ,deletedComment , "comment deleted successfully")
    )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
    }