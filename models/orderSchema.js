const mongoose = require('mongoose'); // Erase if already required
const {Schema}=mongoose; 
const { v4: uuidv4 } = require('uuid');

// Declare the Schema of the Mongo model
const orderSchema = new Schema({
    orderId: {
        type: String,
        unique: true,
        default: uuidv4,
    }, 
  userId:{
    type:Schema.Types.ObjectId,
    ref:'User',
    required:true
  },
  orderItems:[{
    product:{
        type:Schema.Types.ObjectId,
        ref:'Product',
        required:true
    },
    productName:{
        type:String,
        required:true
    },
    productImage:{
        type:String,
        required:true
    },    
    price:{
        type:Number,
        default:0        
    },
    quantity:{
        type:Number,
        required:true
    },
    subtotal:{
        type:Number,
        required:true
    },
    returnStatus:{
      type: String,
       default: null
    },
    returnReason:{
      type:String,
      default: null
    }
  }],
  totalPrice:{
    type:Number,
    requred:true
  },
  discount:{
    type:Number,
    default:0
  },
  deliveryPrice:{
    type:Number,
    default:0
  },
  orderPrice:{
    type:Number,
    required:true
  },
  address:{
    type:Schema.Types.ObjectId,
    ref:'Address',
    required:true
  },
  paymentMethod:{
    type:String,
    required:true
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed'],
    default: 'Pending'
  },
  receipt:{
    type:String,
    default:null,
    trim:true
  },
  invoiceDate:{
    type:Date,
  },
  invoiceNo:{
    type:String,
    default:'',
    trim:true
  },
  status:{
    type:String,
    required:true,
    enum:['Placed','Processing','Shipped','Delivered','Cancelled','Return Request',"Returned"]
  },
  createdOn:{
    type:Date,
    default:Date.now,
    required:true
  },
  paymentDate:{
    type:Date
  },
  deliveryDate:{
    type:Date
  },
  shippingDate:{
    type:Date
  },   
  coupon:{
    type:String,
    default:null
  }
  
}
);

//Export the model
module.exports = mongoose.model('Order', orderSchema);
