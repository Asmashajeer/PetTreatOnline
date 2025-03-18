const mongoose = require('mongoose'); 
const {Schema}= mongoose;


const couponSchema= new Schema({
    couponCode:{
        type:String,
        required:true,
        unique:true
    },
    startOn:{
        type:Date,
        default:Date.now,
        required:true
    },
    expireOn:{
        type:Date,
        required:true
    },
    discountValue:{
        type:Number,
        required:true
    },
    minimumPrice:{
        type:Number,
        required:true
    },
    isActive:{
        type:Boolean,
        default:true
    },
    isExpired:{
        type:Boolean,
        default:false
    },
  
})

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports=Coupon;