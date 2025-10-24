// require('dotenv').config({path: './env'})

import dotenv from "dotenv"
import connectDB from "./db/connect.db.js";

dotenv.config({
  path: "./env",
});
connectDB()











// import express from "express"
    
//     const app = express()

// ; (async () => {
//     try {
//         await mongoose.connect(`${process.env.MONDODB_URI}/${DB_NAME}`)
//         app.on("error", (error) => {
//             console.log("ERRR: ", error);
//             throw error
            
//         })


//         app.listen(`${process.env.PORT}`, (req, res) => {
//             console.log(`listing to port: ${process.env.PORT}`);
        
//         })
//     }
//     catch (error) {
//         console.log("ERROR:", error)
//         throw error
//     }
// })
