import { Router } from 'express';
import {
    deleteVideo,
    getAll,
    getAllVideos,
    getVideoById,
    publishAVideo,
    togglePublishStatus,
    updateviews,
    updateVideo,
} from "../controllers/video.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import {upload} from "../middlewares/multer.middleware.js"

const router = Router();
// router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router
    .route("/")
    .get(verifyJWT , getAllVideos)
    .post(
        upload.fields([
            {
                name: "videoFile",
                maxCount: 1,
            },
            {
                name: "thumbnail",
                maxCount: 1,
            },
            
        ]), verifyJWT ,
        publishAVideo
    );

router.route("/all/").get(getAll);

router
    .route("/:videoId")
    .get(getVideoById)
    .delete(verifyJWT , deleteVideo)
    .patch(upload.single("thumbnail"),verifyJWT , updateVideo);

router.route("/toggle/publish/:videoId").patch(verifyJWT , togglePublishStatus);
router.route("/update-views/:videoId").get(updateviews)

export default router