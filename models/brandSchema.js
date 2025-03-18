const mongoose = require('mongoose'); // Erase if already required
const {Schema}= mongoose
// Declare the Schema of the Mongo model
const brandSchema = new Schema({
    brandName:{
        type:String,
        required:true,
        unique:true,      
    },
    brandImage:{
        type:[String],
        required:true,       
    },
    isBlocked:{
        type:Boolean,
        default:false,        
    },
    createdAt:{
        type:Date,
        default:Date.now,
    },
});

//Export the model
const Brand = mongoose.model('Brand',brandSchema);
module.exports=Brand;