const mongoose = require('mongoose'); 
const Schema= mongoose.Schema;



// Declare the Schema of the Mongo model


const userSchema = new Schema({
    name:{
        type:String,
        required:true       
    },
    email:{
        type:String,
        required:true,
        unique:true
    }, 
    googleId:{
        type:String,
        unique:true,
        sparse:true,       
       },
    password:{
        type:String,
        required:false
    },
    isBlocked:{
        type:Boolean,
        default:0
    },
    isAdmin:{
        type:Boolean,
        default:0
    }, 
    referralCode: { // Unique code for each user
        type: String,
         unique: true,
         sparse:true
    },    
    usedCoupons: [{ 
        type: String,
         default:null
     }], 
    
    createdOn:{
        type:Date,
        default:Date.now
    }
})




//Export the model
module.exports  = mongoose.model('User', userSchema); 


