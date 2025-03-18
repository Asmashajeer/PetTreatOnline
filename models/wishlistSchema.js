const mongoose = require('mongoose'); // Erase if already required
const {Schema}= mongoose;

// Declare the Schema of the Mongo model
const wishlistrSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true,        
    },
    products:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:'Product',
            required:true,
        },
        addedOn:{
            type:Date,
            default:Date.now,
        }
    }],
   
});

//Export the model
const Wishlist = mongoose.model('Wishlist', wishlistrSchema);
module.exports= Wishlist;