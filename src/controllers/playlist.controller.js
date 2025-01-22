import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    // create playlist
    if (
        [name , description].some((field) => !field || field.trim() === "")
    ){
        throw new ApiError(400 , "name and description are required")
    }
    const newplaylist = await Playlist.create({
        name,
        description,
        owner : req.user?._id
    })
    if (!newplaylist){
        throw new ApiError(500 , "Error while creating new Playlist")
    }
    return res.status(200)
    .json(
        new ApiResponse(200 , newplaylist , "New Playlist created successfully")
    )
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const playlists = await Playlist.aggregate([
        {
            $match : {
                owner : req.user?._id
            }
        },
        {
            $project : {
                _id : 1,
                name : 1,
                description : 1,
                videos : 1
            }
        }
    ])
    if (!playlists){
        throw new ApiError(500 , "Error while getting User playlists")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, playlists , "User Playlists fetched successfully")
    )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // get playlist by id
    const isplaylistIdValid = isValidObjectId(playlistId)
    if (!isplaylistIdValid){
        throw new ApiError(400 ,"Invalid playlistId")
    }
    const findplaylist = await Playlist.findById(playlistId)
    if (!findplaylist){
        throw new ApiError(400 , "Invalid playlistId")
    }

    if (!(findplaylist.owner).equals(req.user?._id)){
        throw new ApiError(400 , "You cannot access this playlist as you are not owner of this playlist")
    }

    const playlist = await Playlist.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "videos",
                foreignField : "_id",
                as : "videodetail",
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
                        $addFields : {
                            ownerfullName : {
                                $first: "$videoowner.fullName"
                            },
                            ownerusername : {
                                $first : "$videoowner.username"
                            },
                            owneremail : {
                                $first : "$videoowner.email"
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            title: 1,
                            views: 1,
                            videoFile: 1,
                            thumbnail: 1,
                            ownerfullName: 1,
                            ownerusername: 1,
                            owneremail: 1
                        }
                    }
                ]
            }
        },
        {
            $project: {
                _id: 0,
                name: 1, // Playlist name
                description: 1, // Playlist description
                videos: "$videodetail" // Array of detailed video documents
            }
        }
    ])

    if (!playlist){
        throw new ApiError(500 , "Error while getting playlist")
    }

    return res.status(200)
    .json(
        new ApiResponse(200 , playlist , "Playlist fetched successfully")
    )
    

})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // add video to playlist
    const isplaylistIdValid = isValidObjectId(playlistId)
    if (!isplaylistIdValid){
        throw new ApiError(400 ,"Invalid playlistId")
    }
    const isvideoIdValid = isValidObjectId(videoId)
    if (!isvideoIdValid){
        throw new ApiError(400 , "Invalid videoId")
    }
    const playlist = await Playlist.findById(playlistId)
    if (!playlist){
        throw new ApiError(400 , "Invalid playlistId")
    }
    const video = await Video.findById(videoId)
    if (!video){
        throw new ApiError(400 , "Invalid videoId")
    }

    if (!(playlist.owner).equals(req.user?._id)){
        throw new ApiError(400 , "You cannot add video to this playlist as you are not owner of this playlist")
    }

    const newplaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet : {
                videos : videoId  // add videoId to videos if it does not exist
                // we can use $push if we allow duplicate video ids in playlist
            }
        },
        {
            new : true
        }
    )
    if (!newplaylist){
        throw new ApiError(500 , "Error while adding video to playlist")
    }
    return res.status(200)
    .json(
        new ApiResponse(200 , newplaylist , "Video added to playlist successfully")
    )

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // remove video from playlist
    const isplaylistIdValid = isValidObjectId(playlistId)
    if (!isplaylistIdValid){
        throw new ApiError(400 ,"Invalid playlistId")
    }
    const isvideoIdValid = isValidObjectId(videoId)
    if (!isvideoIdValid){
        throw new ApiError(400 , "Invalid videoId")
    }
    const playlist = await Playlist.findById(playlistId)
    if (!playlist){
        throw new ApiError(400 , "Invalid playlistId")
    }
    const video = await Video.findById(videoId)
    if (!video){
        throw new ApiError(400 , "Invalid videoId")
    }

    if (!(playlist.owner).equals(req.user?._id)){
        throw new ApiError(400 , "You cannot remove video from this playlist as you are not owner of this playlist")
    }

    const newplaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull : {
                videos : videoId
            }
        },
        {
            new : true
        }
    )
    if (!newplaylist){
        throw new ApiError(500 , "Error while removing video from playlist")
    }
    return res.status(200)
    .json(
        new ApiResponse(200 , newplaylist , "Video removed from playlist successfully")
    )

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // delete playlist
    const isplaylistIdValid = isValidObjectId(playlistId)
    if (!isplaylistIdValid){
        throw new ApiError(400 ,"Invalid playlistId")
    }
    const playlist = await Playlist.findById(playlistId)
    if (!playlist){
        throw new ApiError(400 , "Invalid playlistId")
    }

    if (!(playlist.owner).equals(req.user?._id)){
        throw new ApiError(400 , "You cannot delete this playlist as you are not owner of this playlist")
    }

    const deletedplaylist = await Playlist.findByIdAndDelete(playlistId)

    if (!deletedplaylist){
        throw new ApiError(500 , "Error while deleting this playlist")
    }
    return res.status(200)
    .json(new ApiResponse(200 , deletedplaylist , "Playlist deleted successfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    // update playlist
    const isValid = isValidObjectId(playlistId)
    if (!isValid){
        throw new ApiError(400 , "Invalid playlistId")
    }

    if (
        [name , description].some((field)=> !field || field.trim() === "")
    ){
        throw new ApiError(400 , "name and description are required")
    }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist){
        throw new ApiError(400 , "Invalid playlistId")
    }

    const updatedplaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set : {
                name , description
            }
        },
        {
            new : true
        }
    )
    if (!updatedplaylist){
        throw new ApiError(500 , "Error while updating playlist")
    }
    return res.status(200)
    .json(
        new ApiResponse(200 , updatedplaylist , "Playlist updated successfully")
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
    }