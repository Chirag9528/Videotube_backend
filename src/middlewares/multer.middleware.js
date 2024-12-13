import multer from "multer"

// Will be used when user will uplaod file -> it will save it on server temporarily
const storage = multer.diskStorage({
    destination: function (req, file, cb) {  // cb is callback
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
})
  
export const upload = multer({ 
    storage,
})