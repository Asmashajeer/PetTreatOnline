const Coupon = require('../../models/couponSchema');
const Order =require('../../models/orderSchema');
const Product= require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const User=require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const Wallet = require('../../models/walletSchema');
const {addTransaction}=require('../../helpers/utils');
const moment = require('moment');

//---------list orders------------------------------

const loadOrders=async(req,res)=>{
    try {    
        console.log(req.query);
            let page=1;
            if(req.query.page){
                page=req.query.page;            
            }
            let limit=5;
            let count=0;         
            let search="";             
                console.log("search query: ",req.query.search);
                 if(req.query.search){
                     search=req.query.search;      
                 
                 }
                   
            let query = {};       
            // Date filter
            if (req.query.dateFrom || req.query.dateTo) {
                query.createdOn = {};
                if (req.query.dateFrom) {
                    query.createdOn.$gte = new Date(req.query.dateFrom);
                }
                if (req.query.dateTo) {
                    query.createdOn.$lte = new Date(req.query.dateTo);
                }
            }

            // ------------- filter -Date-, -status-,-price-,
            if (req.query.status) {
                query.status = req.query.status;
            }

            // Price filter
            if (req.query.minPrice || req.query.maxPrice) {
                query.orderPrice = {};
                if (req.query.minPrice) {
                    query.orderPrice.$gte = parseFloat(req.query.minPrice);
                }
                if (req.query.maxPrice) {
                    query.orderPrice.$lte = parseFloat(req.query.maxPrice);
                }
            }

            console.log("query=",query);
            
            if(Object.keys(query).length !== 0){
                orderData = await Order.find(query)
                .populate('userId', 'name')
                .sort({ createdOn: -1 });

                count = await Order.find(query)
                .populate('userId', 'name')
                .sort({ createdOn: -1 }).countDocuments();
               
            }else{
                
                     orderData=await Order.find({            
                         $or:[
                             {orderId:{$regex:'.*'+search+'.*', $options: 'i'}},
                             
                             {status:{$regex:'.*'+search+'.*', $options: 'i' }}
                         ]
                     }).populate('userId')
                     .sort({createdOn:-1})
                     .limit(limit*1)
                     .skip((page-1)*limit)
                     .exec();
                         
                     count=await Order.find({            
                     $or:[
                         {orderId:{$regex:'.*'+search+'.*',$options: 'i'}},             
                         {status:{$regex:'.*'+search+'.*',$options: 'i'}}
                     ],
                     }).countDocuments();                           
                     
                 
            }   
     
        if(!orderData){
            console.log("no order found");
            res.render('orders',{message:"No order"});
        }
      const totalOrders= await Order.find().countDocuments();
                  const totalOrderCompleted= await  Order.find().countDocuments({status:'Delivered'});
                  const totalOrderCancelled= await  Order.find().countDocuments({status:'Cancelled'});
                  const totalOrderPending = await Order.countDocuments({
                      status: { $nin: ['Delivered', 'Returned', 'Cancelled'] }});  
                 
        const totalOrderStatus={
            totalOrders,
            totalOrderCompleted,
            totalOrderPending ,
            totalOrderCancelled
        }
        res.render('orders',{orders:orderData,totalOrderStatus,totalPages:Math.ceil(count/limit),currentPage:page});
    } catch (error) {
        console.error("server error",error);
        res.status(500).redirect('/pageError');
    }
}

//---------------------------view an Order---------------
const viewOrder =async(req,res)=>{
    try {
         
        const orderId=req.params.id;
        const orderStatusValues = Order.schema.path("status").enumValues;       
      
        const singleOrder=await Order.findOne({orderId:orderId}).populate('userId');
        if(!singleOrder){
            console.log(" order not found or error");
            return res.redirect('/admin/orders');
        }
        
        const userAddress=await Address.findOne({userId:singleOrder.userId});       
        userAddress.address.forEach((address)=>{
            if((address._id).toString===(singleOrder.address).toString){
                orderAddress=address;
            }
        })
        res.render('changeOrderStatus',{order:singleOrder,address:orderAddress,statusValues:orderStatusValues,moment});
    } catch (error) {
        console.log("error fetching Order Details:",error);
        res.redirect("/pageError");
    }
}
//---------------------------Change status---------------------
const changeOrderStatus =async (req,res)=>{
    try {
        
        const orderId=req.params.id;
        const {changedStatus}= req.body;
        console.log(changedStatus,orderId);
        //----------------------cancel An Order  by admin-----
        if(changedStatus==='Cancelled'){
            const orderData= await Order.findOne({orderId:orderId});
            if(!orderData){
                console.log("order not found");
                res.redirect(`/admin/orders/changeOrderStatus/${orderId}`);
            }

            for(let item of orderData.orderItems){
                console.log(item.quantity)
                updated= await Product.findBydAndUpdate(item.product,{$inc:{quantity:item.quantity}}, { new: true });  //add cancelled quantity to stock
            } 
            // refund for paid user to wallet        
            if(orderData.paymentStatus==='Paid'){
                let transaction={
                    transactionType:'Credit',      
                    amount:orderData.orderPrice,
                    description:`cancelled an order by Admin`,
                    orderId
                };
                //-----add  to wallet
                const updatedWallet= await Wallet.updateOne(
                    {userId:orderData.userId},
                    {
                        $push:{transactions:transaction},
                        $inc:{walletAmount:orderData.orderPrice}
                    },{ upsert: true });

                console.log( updatedWallet);
                addTransaction(orderId,orderData.userId,'Credit',transaction.amount, 'Refund',transaction.description);    
                
            }         
        }    
        else if(changedStatus==='Delivered'){
            if(orderData.paymentStatus!=='paid'){
                orderData= await Order.findOneAndUpdate({orderId:orderId}, { $set: { status: changedStatus,paymentStatus:'Paid',deliveryDate:Date.now(),paymentDate:Date.now()} },{new:true});
                return res.status(200).json({success:true,changedStatus:changedStatus});
            }else{
                orderData= await Order.findOneAndUpdate({orderId:orderId}, { $set: { status: changedStatus,deliveryDate:Date.now()} },{new:true});
                return res.status(200).json({success:true,changedStatus:changedStatus});
            }
        }    
        
        if(changedStatus==='Shipped'){
            orderData= await Order.findOneAndUpdate({orderId:orderId}, { $set: { status: changedStatus,shippingDate:Date.now()} },{new:true});
                return res.status(200).json({success:true,changedStatus:changedStatus});
        }   
        orderData= await Order.findOneAndUpdate({orderId:orderId}, { $set: { status: changedStatus } },{new:true});
        if(!orderData){
            console.log("order Status not changed!");
            return res.json({success:false,message:"order Status not updated!"})
        }    
        res.status(200).json({success:true,changedStatus:changedStatus});
        console.log(`order Status  changed to  ! ${changedStatus}`);
    } catch (error) {
        console.log("Error:cannot change status",error);
        res.status(400).json({success:false,message:'cannot change status'});
    }
}
//-----------------management Return-------------------
const manageReturnForm= async(req,res)=>{
    const {orderId,productId}= req.params;
    console.log(orderId,productId);
    const order =await Order.findOne({orderId:orderId});
    for (let item of order.orderItems) {
        if (item.product.toString() === productId && item.returnStatus==='Return Request') {
            console.log('----------------------',item);
             return res.render('manageReturn',{ orderId:orderId,item:item});
        }
    }
}
//-----------------------return management---------------------
//-------------------return An Item---------------
const updateReturn =async(req,res)=>{
    const userId=req.session.user;
    try {
        const { orderId, productId,quantity,price ,action}=req.body;
        const order= await Order.findOne({orderId:orderId});
        if(order.status==='Cancelled' ||order.status==='Returned'){
            return res.json({success:false,message:'order already cancelled or returned'});
        }    
        if (action === "reject") {
            let  updatedOrder= await Order.updateOne(
                { orderId: orderId, status: "Delivered", "orderItems.product": productId, "orderItems.returnStatus": "Return Request" },
                { $set: { "orderItems.$.returnStatus": "Return Rejected"} });            
                if(!updatedOrder.modifiedCount>0){
                    console.log('Cannot Accept tthe return request ');
                     return res.json({success:false,message:"Cannot Accept tthe return request"});
                }
                return res.json({success:true,message:"Admin rejected the return request "});
        }
       
        if (action === "accept") {
            if(order.orderItems.length===1){
                  updatedOrder= await Order.updateOne(
                    { orderId: orderId, status: "Delivered", "orderItems.product": productId, "orderItems.returnStatus": "Return Request" },
                    { $set: { "orderItems.$.returnStatus": "Return Approved",status:'Returned' } });
            }else{
                  updatedOrder= await Order.updateOne(
                { orderId: orderId, status: "Delivered", "orderItems.product": productId, "orderItems.returnStatus": "Return Request" },
                { $set: { "orderItems.$.returnStatus": "Return Approved" } }
            );
            }
            if(!updatedOrder.modifiedCount>0){
                console.log('Cannot Accept tthe return request ');
                 return res.json({success:false,message:"Cannot Accept tthe return request"});
            }
                               
            const returnQuantity =parseInt(quantity);        
            const  returnPrice= parseFloat(price);
            console.log(orderId,productId,returnQuantity,returnPrice);
            const totalReturnPrice=returnPrice*returnQuantity;     
      
            // refund to user wallet        
            if(order.paymentStatus==='Paid'){
                let transaction={
                    transactionType:'Credit',      
                    amount:totalReturnPrice,
                    description:`Return an item from Order`,
                    orderId
                };
                //-----add  to wallet
                const updatedWallet= await Wallet.updateOne(
                    {userId:userId},
                    {
                        $push:{transactions:transaction},
                        $inc:{walletAmount:totalReturnPrice}
                    },{ upsert: true });

                console.log( updatedWallet);
                addTransaction(orderId,userId,'Credit',transaction.amount, 'Refund',transaction.description);    
                return res.status(200).json({success:true,message:'Accepted'});  
            }
        } 
            
               
    } catch (error ) {
        console.log("ServerError :",error);
        res.status(500).json({success:false,message:"Return  this item failed"});
    }

}
module.exports={
    loadOrders,
    viewOrder,
    changeOrderStatus,
    manageReturnForm,
    updateReturn
}  