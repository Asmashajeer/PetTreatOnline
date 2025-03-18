const mongoose = require('mongoose'); // Erase if already required
const {Schema}= mongoose;


// Declare the Schema of the Mongo model
const productSchema = new Schema({
    productName:{
        type:String,
        required:true,
      
    },
    description:{
        type:String,
        required:true,       
    },
    brand:{
        type:String,
        required:true,        
    },
    category:{
        type:Schema.Types.ObjectId,
        ref:'Category',
        required:true,
    },
    regularPrice:{
        type:Number,
        required:true,
    },
    salePrice:{
        type:Number,
        required:true,
    }, 
    productOffer:{
        type:Number,
        default:0
    },     
    stock:{
        type:Number,
        required:true,
    },
    weight:{
        type:String,
        required:true,
    },
    productImages:{
        type:[String],
        required:true,
    },
    isBlocked:{
        type:Boolean,
        default: false,
    },
    status:{
        type:String,
        enum:['Available', 'Out of Stock','discontinued'],
        required:true,
        default:'Available',
    }, 
    createdAt:{
        type:Date,
        default:Date.now,      
    },
    updatedAt:{
        type:Date,
        default:Date.now,      
    }
});

//Export the model
const Product= mongoose.model('Product', productSchema);
module.exports =Product;