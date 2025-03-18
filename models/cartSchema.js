const mongoose = require('mongoose'); 
const {Schema}=mongoose;


// Declare the Schema of the Mongo model
const cartSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true,       
    },
    items:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:'Product',
            required:true,
            
        },
        quantity:{
            type:Number,
            default:1,
        },
       
        status:{
            type:String,
            default:'placed',
        },
        cancellationReason:{
            type:String,
            default:'none',
        }
    }],
    totalQty:{
        type:Number,
        default:0,
    } ,
    totalPrice:{
        type:Number,
        default:0,
    }
    
});

//Export the model
const Cart = mongoose.model('Cart', cartSchema);
module.exports=Cart;