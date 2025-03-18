const mongoose = require('mongoose'); // Erase if already required
const {Schema}= mongoose;
const walletSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true,        
    },    
    transactions:[{        
        transactionType:{
            type:String,
            required:true,
            enum:['Debit','Credit']
        },
        amount:{
            type:Number,
            required:true
        },
        timestamp:{
            type:Date,
            default:Date.now,
         },
        description:{
            type:String,
            required:true
         },
         orderId:{
            type:String            
         }
    }] ,
    walletAmount:{
        type:Number,
        default:0           
    }    
});

module.exports=mongoose.model('Wallet',walletSchema);