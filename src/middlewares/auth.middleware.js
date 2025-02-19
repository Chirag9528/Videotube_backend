import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken"
import {User} from "../models/user.model.js"

// Custom middleware
export const verifyJWT = asyncHandler(async(req , _ , next) => { // _ is used because we are not using response
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
    
        if (!token){
            throw new ApiError(401 , "Unauthorized request")
        }
    
        const decodedToken = jwt.verify(token , process.env.ACCESS_TOKEN_SECRET )
    
        const user = await User.findById(decodedToken?._id)
        .select("-password -refreshToken")
    
        if (!user){
            throw new ApiError(401 , "Invalid Access Token")
        }
    
        req.user = user;  // adding user object to request so that we can access it by using req.user
    
        next()
    } catch (error) {
        throw new ApiError(401 , error?.message || "Invalid access token")
    }

})
