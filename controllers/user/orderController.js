const Coupon = require('../../models/couponSchema');
const Order =require('../../models/orderSchema');
const Product= require('../../models/productSchema');
const Category =require('../../models/categorySchema');
const Cart = require('../../models/cartSchema');
const User=require('../../models/userSchema');
const Address= require('../../models/addressSchema');
const Wallet =require('../../models/walletSchema');
const Ledger= require('../../models/ledgerSchema');
const moment=require('moment');
const Razorpay = require('razorpay');
const bodyParser= require('body-parser');
const crypto=require('crypto');
const {generateReceiptNumber,generateInvoiceNumber,addTransaction}=require('../../helpers/utils');
const env =require('dotenv').config();
const puppeteer = require("puppeteer");



const razorpay = new Razorpay({
    key_id:process.env.RAZORPAY_KEY_ID,
    key_secret:process.env.RAZORPAY_KEY_SECRET
})


//----------------create order---------------------------
const createOrder= async(req,res)=>{
    try {
        const userId=req.session.user;
       
        const { addressId,paymentMethod, discount, deliveryPrice,orderPrice} = req.body;
        const user=await User.findById(userId);
        if(!user){
            console.login("user not found");
            return res.redirect('/');
        }
         //---fetching Cart
         const mycart= await Cart.findOne({userId:userId}).populate('items.productId');    
         if (!mycart){
            console.log('No Cart!');
            return res.redirect("/cart");             
        }  
        const unavail=mycart.items.filter(item=>item.productId.stock<item.quantity);
        
        if(unavail.length>0){
            return res.json({success:false,message:"one or more  items in your cart is out of stock,check your Cart" })
        }
         const orderItems=mycart.items.map(item=>({           
             product: item.productId._id, // Product ID
             productName: item.productId.productName,   // Product Name
             productImage:item.productId.productImages[0],
             price: item.productId.salePrice, // Product Price
             quantity: item.quantity,    // Quantity
             subtotal: item.quantity * item.productId.salePrice, // Total for item
         }));
         const totalPrice = mycart.totalPrice;
       
        let coupon=null;
        if(req.session.coupon){
           coupon=req.session.coupon.code;
        }
        console.log('coupon   :',coupon);
        if (paymentMethod ==='razorpay'){
            const options = {
                amount: orderPrice*100, 
                currency:'INR',
                receipt:generateReceiptNumber(),
            };
            const razorPayOrder = await razorpay.orders.create(options);
            const newOrder = new Order({
                orderId:razorPayOrder.id,
                userId:userId,
                orderItems,
                totalPrice,
                discount,
                deliveryPrice,
                orderPrice,
                address: addressId,
                paymentMethod,
                paymentStatus:'Pending',
                invoiceDate: new Date(),
                status: "Placed",
                receipt:razorPayOrder.receipt,
                Coupon:coupon
            });
            await newOrder.save();            
            return res.status(200).json({message:"Razor Pay Order Created",user:user, orderDetails:razorPayOrder});
        }else if(paymentMethod ==='wallet'){
                const wallet=await Wallet.findOne({userId:userId});
                if(wallet && wallet.walletAmount>orderPrice){
                    const newOrder = new Order({
                        userId:userId,
                        orderItems,
                        totalPrice,
                        discount,
                        deliveryPrice,
                        orderPrice,
                        address: addressId,
                        paymentMethod,
                        paymentStatus:'Paid',
                        invoiceDate: new Date(),
                        status: "Placed",           
                        Coupon:coupon
                    });
                    await newOrder.save();  
                    let description=`order placed with ID ${newOrder.orderId}`
                    addTransaction(newOrder.orderId,userId,'Credit',orderPrice, paymentMethod,description);
                    reduceStockOnOrder (userId,newOrder.orderId);
                    let transaction={
                        transactionType:'Debit',      
                        amount:orderPrice,
                        description:`Purchased with order Number - # ${newOrder.orderId}` 
                    };
                     const puchaseWithWallet= await Wallet.updateOne(
                            {userId:userId},
                            {
                                $push:{transactions:transaction},
                                $inc:{walletAmount:-orderPrice}
                            },{ upsert: true });
                            res.json({ success: true, message: "Order placed successfully!" ,redirect:`/orderSuccess?id=${newOrder.orderId}`});
                }else{
                    console.log("Wallet haven't Sufficent balance!");
                    res.json({ success: false, message: "Insufficent balance in Wallet!" });
                }
        }else if(paymentMethod ==='COD' && orderPrice<=1000){
            const newOrder = new Order({
                userId:userId,
                orderItems,
                totalPrice,
                discount,
                deliveryPrice,
                orderPrice,
                address: addressId,
                paymentMethod,
                paymentStatus:'Pending',
                invoiceDate: new Date(),
                status: "Placed",           
                Coupon:coupon
            });
            await newOrder.save();      
            let description=`order placed with ID ${newOrder.orderId} COD Pending`;
            addTransaction(newOrder.orderId,userId,'Debit',orderPrice, paymentMethod,description);
            reduceStockOnOrder (userId,newOrder.orderId);
            res.json({ success: true, message: "Order placed successfully!" ,redirect:`/orderSuccess?id=${newOrder.orderId}`});
        }
       
        
    } catch (error) {
        console.error("Order creation error:", error);
        res.status(500).json({ success: false, message: "Order placement failed. Kindly check  and re-submit your order." });
    }
}



//------------------order Verification-------------
async function verifyPayment(req,res){
    try{
        const userId=req.session.user;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature} = req.body;
        const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generatedSignature = hmac.digest("hex");

        const order = await Order.findOne({orderId:razorpay_order_id})

        if (generatedSignature === razorpay_signature  && order) {
           
           console.log("Order placed successfully'");
           reduceStockOnOrder (userId,order.orderId);
           req.session.cartSize=0;
           await Order.findOneAndUpdate({orderId:order.orderId},{$set:{paymentStatus:'Paid'}});
           let description=`order placed and payment received with ID ${order.orderId} `;
           addTransaction(order.orderId,userId,'Credit',order.orderPrice, 'razorpay',description);
          return res.json({ success: true, message: "Order placed successfully!" ,redirect:`/orderSuccess?id=${order.orderId}`});


        } else {
            console.log("Orderpayment Failed");
            await Order.findOneAndUpdate({orderId:order.orderId},{$set:{paymentStatus:'Pending'}});
            return res.json({ success: false, message: "Payment failed. Kindly check  and re-submit your order.",redirect:`/orderFailed?id=${order.orderId}` });
           
            

        }

    }catch(error){
        res.status(500).json({message:'Internal Server Error',error:error.message})
    }
}



//---- stock Management  of product on Order---------------
async function reduceStockOnOrder (userId,orderId){
    
    const order=await Order.findOne({orderId:orderId,userId:userId});
    console.log(order);
    const orderItems=order.orderItems;

     for(let item of orderItems){
        console.log(item.quantity)
       updated= await Product.findByIdAndUpdate(item.product,{$inc:{stock:-item.quantity}}, { new: true }); 
       console.log("quantity of product reduced from stock");
   }
                                        //--------addcoupon to user database-----------
    const usedcoupon=await User.findByIdAndUpdate(userId,{$push:{usedCoupons:order.coupon}})   
    if(usedcoupon){
        console.log("used coupon added");
    }
                                    //----------empty the cart------------
    const emptyCart=await Cart.findOneAndDelete({userId:userId });
   
    console.log("removed Cart items");
    if(!emptyCart){
        console.log("error while removing Cart items");
    }
}

//---------------succcess order----------
const orderSuccess =async (req,res)=>{
   try {
        const orderId=req.query.id;
        console.log(`orderId:${orderId}`);
        let order=await Order.findOne({orderId:orderId});
        if(!order){
            console.log("order details not found");
                return res.redirect('/pageNotFound');
        }
        if(req.session.coupon){
            delete req.session.coupon;
        }
        const invoiceNo=generateInvoiceNumber(orderId);
        console.log('invoiceNo',invoiceNo);
        const orderData=await Order.updateOne({orderId:orderId},{$set:{invoiceNo:invoiceNo,invoiceDate:Date.now()}},{new:true});
       if(orderData.modifiedCount>0){        
            order=await Order.findOne({orderId:orderId});

            res.render('orderSuccess',{orderData:order,moment});
       }else
            console.log("Add  invoice number to order failed") ;
    } catch (error) {
        console.log("error loading order succcess page",error);
        return res.redirect('/pageNotFound');
   } 
}

//---------------order Failed---------------
const orderFailed= async (req,res)=>{
    try {
        const orderId=req.params.id;
        console.log(`orderId:${orderId}`);
        console.log("inside");
        const orderData=await Order.findOne({orderId:orderId});
        
        if(!orderData){
            console.log("order details not found");
                return res.redirect('/pageNotFound');
        }
        res.render('failedOrder',{orderData:orderData});
    } catch (error) {
        console.log("error loading order failurepage");
        res.render('failedOrder');
   } 
}
//----------------------------order retry-------------
const retryPayment= async(req,res)=>{
    try{
        const userId=req.session.user;
        const user=await User.findById(userId);
        const orderId=req.params.id;
        console.log('orderId---',orderId);
        const order=await Order.findOne({orderId:orderId});  
        console.log('order----',order);
        if (!order) {
            console.log("Order not found");
            return res.json({success:false, message: "Order not found" });
        }
        if(order.paymentStatus!=='Pending' || order.paymentMethod!=='razorpay'){
            console.log("Retry forthis order not possilble");
            return res.json({message:"Retry forthis order not possilble"});
        }
        const options = {
            amount: order.orderPrice*100, 
            currency:'INR',
            receipt:order.receipt,
        };
        const razorPayOrder = await razorpay.orders.create(options);
        console.log("Razor Pay Order Created   ---",razorPayOrder);
        return res.json({success:true,message:"Razor Pay Order Created",user:user, orderDetails:razorPayOrder,currOrderId:orderId});
    }
    catch(error){
        console.log("error While retry payment",error);
        res.json({success:false,message:error});
    }
    
}

//------------------order Verification-------------
async function verifyRetryPayment(req,res){
    try{
        const userId=req.session.user;
        console.log(req.body);
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature,currOrderId} = req.body;
        console.log(`inside verifyRetryPayment--------   ${currOrderId}`);
        const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generatedSignature = hmac.digest("hex");

        const order = await Order.findOne({orderId:currOrderId})

        if (generatedSignature === razorpay_signature  && order) {
           
           console.log("Order placed successfully'");
           reduceStockOnOrder (userId,order.orderId);
           await Order.findOneAndUpdate({orderId:order.orderId},{$set:{paymentStatus:'Paid'}});
          return res.json({ success: true, message: "Order placed successfully!" ,redirect:`/orderSuccess?id=${order.orderId}`});


        } else {
            console.log("Orderpayment Failed");
            await Order.findOneAndUpdate({orderId:order.orderId},{$set:{paymentStatus:'Pending'}});
            return res.json({ success: false, message: "Payment failed. Kindly check  and re-submit your order.",redirect:`/orderFailed?id=${order.orderId}` });
           
        }

    }catch(error){
        console.log(error.message);
        res.status(500).json({message:'Internal Server Error',error:error.message})
    }
}




//------------------------detailed Order View-----------------
const detailedOrderView =async(req,res)=>{
    try {
        const orderId=req.params.id;
        console.log(orderId);
          const singleOrder=await Order.findOne({orderId:orderId}).populate('userId');// First populate User details
          const category= await Category.find({isBlocked:false});
        if(!singleOrder){
            console.log(" order not found or error");
            return res.redirect('/profile#orders');
        }
        console.log(singleOrder.address);
        const userAddress=await Address.findOne({userId:singleOrder.userId});       
        userAddress.address.forEach((address)=>{
            if((address._id).toString===(singleOrder.address).toString){
                orderAddress=address;
            }
        })
        
       res.render('detailedOrderView',{category,order:singleOrder,address:orderAddress,moment});
    } catch (error) {
        console.log("error fetching order details:",error);
        res.redirect("/pageNotFound");
    }
}

//-----Restocking- order management On Cancelled order-------

async function restockCancelOrder (userId,orderId){
    
    const order=await Order.findOne({orderId:orderId,userId:userId});
    console.log(order);
    const orderItems=order.orderItems;

    for(let item of orderItems){
        console.log(item.quantity)
       updated= await Product.findByIdAndUpdate(item.product,{$inc:{stock:item.quantity}}, { new: true }); 
       console.log("quantity ofcancelled product added to stock");
    }
                                        //--------addcoupon to user database-----------
    const usedcoupon=await User.findByIdAndUpdate(userId,{$push:{usedCoupons:order.coupon}})   
    if(usedcoupon){
        console.log("used coupon added");
    }
                                    //----------empty the cart------------
    const emptyCart=await Cart.findOneAndDelete({userId:userId });
    console.log("removed Cart items");
    if(!emptyCart){
        console.log("error while removing Cart items");
    }
}



//---------------------Cancell Order------
const cancelOrder= async(req,res)=>{
    try {
        const orderId= req.params.id;
        const userId=req.session.user;
        const userOrder= await Order.findOne({orderId:orderId ,userId:userId});
        if(!userOrder){
            console.log(`order ID:${orderId} order not found`);
            res.redirect('/pageNotFound');
        }
        console.log(userOrder.status);
        if(userOrder.status!=='Delivered' && userOrder.status!=='Cancelled' ){
            if(userOrder.paymentStatus!=='Paid'){
                const changeStatus=await Order.updateOne({orderId:orderId},{$set:{status:'Cancelled'}}); 
                let description=`Cancelled a COD order with orderId  ${orderId}`;    
                addTransaction(orderId,userId,'Credit',userOrder.orderPrice, 'COD',description);                  
            }else{
                let transaction={
                    transactionType:'Credit',      
                    amount:userOrder.orderPrice,
                    description:`cancelled an Order `,
                    orderId:orderId
                };
                //-----add  to wallet
                const updatedWallet= await Wallet.updateOne(
                    {userId:userId},
                    {
                        $push:{transactions:transaction},
                        $inc:{walletAmount:userOrder.orderPrice}
                    },{ upsert: true });
                console.log( updatedWallet);
               const changeStatus=await Order.updateOne({orderId:orderId},{$set:{status:'Cancelled'}});
               addTransaction(orderId,userId,'Credit',transaction.amount, 'Refund',transaction.description);   
            }
            restockCancelOrder(userId,orderId);
                res.redirect('/profile?tab=orders');
            
        }else{
            console.log(":Cannot  cancel this order is delivered or already Cancelled");
            res.redirect(`/profile/?tab=addresses`);
        }
    } catch (error) {
        console.log("Error in cancellation request",error);
        res.redirect('/pageNotFound');
    }
}
//------CancelAnItem-----------------------------------
const cancelAnItem= async(req,res)=>{
    const userId=req.session.user;
    try{
        const {orderId,cancelledProductId}=req.body;
        const cancelledQuantity =parseInt(req.body.cancelledQuantity);
       const  cancelledPrice= parseFloat(req.body.cancelledPrice);
        console.log(orderId,cancelledProductId,cancelledQuantity,cancelledPrice);
        
        const totalCancelledPrice=cancelledPrice*cancelledQuantity;
        const order= await Order.findOne({orderId:orderId});
        if(order.status==='Delivered' || order.status==='Cancelled' ){
            return res.json({success:false,message:'order already cancelled or delivered'});
        }
    //    if(order.discount){
    //     order.totalPrice>
    //    }
        //---update order--
        const updateOrder = await Order.updateOne({orderId:orderId,userId:userId},
            {   $pull:{orderItems:{product:cancelledProductId}},
                $inc:{totalQty:-cancelledQuantity,totalPrice:-totalCancelledPrice,orderPrice:-totalCancelledPrice}                
            }
        ); 
        if(updateOrder.modifiedCount>0){
            console.log("product cancelled from order");
            //  return res.redirect(`/orders/detailedOrderView/${orderId}`);
        }else{
            return res.json({message:`cannot  cancel product  from order`});
            console.log(" cannot  cancel product  from order");
        } 
        
        //-update product stock 
        const updateProduct= await Product.findByIdAndUpdate(cancelledProductId,{$inc:{stock:cancelledQuantity}},{new:true});
        if(updateProduct.modifiedCount>0)
            console.log("cancelled quantity added to product stock");
        else
            console.log("error: cancelled quantity cannot add to product stock");

        const updatedOrder= await Order.findOne({orderId:orderId});

        // refund to user wallet        
        if(updatedOrder.paymentStatus==='Paid'){
             let transaction={
                    transactionType:'Credit',      
                    amount:totalCancelledPrice,
                    description:`cancelled an item:  ${updateProduct.productName}  from Order `,
                    orderId:orderId
                };
                //-----add  to wallet
                const updatedWallet= await Wallet.updateOne(
                    {userId:userId},
                    {
                        $push:{transactions:transaction},
                        $inc:{walletAmount:totalCancelledPrice}
                    },{ upsert: true });
                
                addTransaction(orderId,userId,'Credit',transaction.amount, 'Refund',transaction.description);    
        }
        console.log(updatedOrder);
        res.status(200).json({success:true,order:updatedOrder});
    }
        catch(error){
            console.log("ServerError :",error.message);
            res.status(500).json({success:false,message:"Cancel order of this item failed"});
     }
}
//---------------------returm oder request form------------------
const returnOrderRequestPage=async(req,res)=>{
    const userId=req.session.user;
    const { orderId, productId,productName,quantity, price } = req.params;
    console.log(orderId, productId,productName,quantity, price);
    res.render('returnRequest', { orderId, productId,productName,quantity,price });
}


const returnOrderRequest =async(req,res)=>{
    const userId=req.session.user;
    console.log(req.params);
    const {orderId,productId,productName,quantity,reason,price} = req.body;
    console.log(orderId,productId,productName,quantity,price);
    const order= await Order.findOne({userId:userId,orderId:orderId});
    console.log(order);
    const  requestAdded=await Order.updateOne(
        { orderId: orderId, "orderItems.product": productId }, // Find the order with the given orderId and productId
        { 
            $set: { 
                "orderItems.$.returnStatus": "Return Request", 
                "orderItems.$.returnReason": reason 
            } 
        } // Update the matched product inside orderItems
    );
    
    if(requestAdded.modifiedCount>0)
    {    console.log("Retun Requested");
        res.redirect('/profile?tab=orders');
    }else
        console.log("failed to Retun Requested");
      
}



//----------------------track order---------------

const trackOrder= async(req,res)=>{
    try {
        const orderId=req.params .id;
        const selectedOrder= await Order.findOne({orderId:orderId});
        if(!selectedOrder){
            console.log("Not found the Order!");
            res.redirect("/PageNotFound");
        }

        res.render("trackOrder",{order:selectedOrder});
    } catch (error) {
        console.log('tracking order error',error);
        res.redirect('/pageNotFound');
    }
}
const invoice=async (req,res)=>{
   
    try {
        const orderId=req.params.id;
        const userId=req.session.user;

        console.log(orderId);
          const order=await Order.findOne({orderId:orderId}).populate('userId');// First populate User details
          
        if(!order){
            console.log(" order not found or error");
            return res.redirect(`/orders/detailedOrderView/${orderId}`);
        }
        console.log(order.address);
        const userAddress=await Address.findOne({userId:order.userId});       
        userAddress.address.forEach((address)=>{
            if((address._id).toString===(order.address).toString){
                orderAddress=address;
            }
        })
        
       res.render('invoice',{order:order,address:orderAddress});
    } catch (error) {
        console.log("error fetching order details:",error);
        res.redirect("/pageNotFound");
    }
        
}


//--------------- export as PDF----------------------
// Route to generate the PDF from the EJS page
const generatePDFInvoice= async (req, res) => {
        const userId=req.session.user;
        try {
            const sessionCookie = req.headers.cookie;
            if (!sessionCookie) {
                throw new Error("User is not authenticated");
            }
            const { orderId } = req.params;
            const browser = await puppeteer.launch({ headless: "new" , args: ["--no-sandbox", "--disable-setuid-sandbox"]});

            const page = await browser.newPage();
            // Set session cookie in Puppeteer
            await page.setExtraHTTPHeaders({
                cookie: sessionCookie,
            });

            await page.goto(`http://localhost:5000/order/invoice/${orderId}`, { waitUntil: "networkidle0" });
            await page.waitForSelector("#invoice-content", { visible: true });
           
    
            const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    
            await browser.close();
            console.log(pdfBuffer);
            res.setHeader("Content-Disposition", `attachment; filename=invoice_${orderId}.pdf`);
            res.setHeader("Content-Type", "application/pdf");
            res.end(pdfBuffer);
        } catch (error) {
            console.error("Error generating PDF:", error);
            res.status(500).send("Error generating PDF");
        }
    }
    


    

module.exports={
    createOrder,
    verifyPayment,
    orderSuccess,
    orderFailed,
    retryPayment,
    verifyRetryPayment,
    detailedOrderView,
    cancelOrder,
    cancelAnItem,
    returnOrderRequestPage, 
     returnOrderRequest,  
    
    trackOrder,
    invoice,
    generatePDFInvoice
}