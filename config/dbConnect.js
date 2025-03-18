const mongoose = require('mongoose');
const env =require('dotenv').config();
 

const dbConnect = async ()=>{
 try{
       const conn= await  mongoose.connect(process.env.MONGODB_URI);
        console.log('Database Connected!');        
    }catch (error){
        console.log('Database connection Error,error.message');  
        process.exit(1);
    }
}

module.exports= dbConnect;