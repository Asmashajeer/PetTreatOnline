const mongoose = require('mongoose'); // Erase if already required
const {Schema}= mongoose;
const referralOfferSchema = new Schema({
    refererAmount:{
        type:Number,       
        required:true,        
    },
    refereeAmount:{
        type:Number,       
        required:true,        
    },
    
    isActive:{
        type:Boolean,
        default:true
    },   
    addedOn:{
        type:Date,
        default:Date.now,
    }
    
   
});

module.exports=mongoose.model('ReferralOffer',referralOfferSchema);