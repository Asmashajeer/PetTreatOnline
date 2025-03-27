const Cart =require('../../models/cartSchema');
const User= require('../../models/userSchema');
const Product =require('../../models/productSchema');
const Address=require('../../models/addressSchema');
const Coupon = require('../../models/couponSchema');
const Wallet =require('../../models/walletSchema');
const ReferralOffer =require('../../models/referralOfferSchema');
const Ledger= require('../../models/ledgerSchema');
const { STATUS_CODE,MESSAGE } = require('../../helpers/utils');


const loadCheckoutPage = async (req, res) => {
    try {
        const id=req.session.user;
        let deliveryPrice=0;
        let discount=0;
        if(!id){
            console.log("please signin & shop");
             return res.redirect("/signIn");
        }
        const userData=await User.findById({_id:id});    
        if(!userData){
            console.log("Error loading userData");
            return res.redirect("/signIn");
        }
        
         //---fetching Cart
        const mycart= await Cart.findOne({userId:userData._id}).populate('items.productId');    
        if (!mycart){
            console.log('------no cart---------');
            return res.redirect("/shop");             
        }  
        const unavail=mycart.items.filter(item=>item.productId.stock<item.quantity);
        if(unavail.length>0){
            
            return res.redirect("/shopingCart");  
           
        }
        //---fetching address--  and coupons-------
        const [addressData, coupons] = await Promise.all([
            Address.findOne({ userId: userData._id }), // Fetch the address data
            Coupon.find({
              
                isActive: true,
                startOn: { $lte: new Date() },
                expireOn: { $gte: new Date() },
            }), // Fetch available coupons
        ]);

        if (!addressData) {
            console.log('Address not found');           
        }
       
       //------fetching cart items-------------
        const orderItems=mycart.items
        .filter(item => item.productId.stock >= item.quantity)
        .map(item=>({
           
                product: item.productId._id, // Product ID
                productName: item.productId.productName,   // Product Name
                price: item.productId.salePrice, // Product Price
                quantity: item.quantity,    // Quantity
                subtotal: item.quantity * item.productId.salePrice, // Total for item
            }
        ));
        const totalPrice = mycart.totalPrice; // Total price from cart   

       
        
        if(req.session.coupon){           
                discount=req.session.coupon.discount;            
        }   
        req.session.checkoutData = {
            user: userData,
            unavail,
            orderItems: orderItems,
            totalPrice: totalPrice,
            discount: discount,
            coupons: coupons,
            deliveryPrice: deliveryPrice,
            cartSize: req.session.cartSize,
            wList: req.session.wList
        };   
        res.render("checkout", {user:userData,addressData:addressData,checkoutData:req.session.checkoutData});
            // res.render("checkout", { user:userData,addressData,orderItems,totalPrice,discount,coupons,deliveryPrice,cartSize:req.session.cartSize,wList:req.session.wList});

       
        console.log(" checkout loaded");
    } catch (error) {
        console.error("Error loading checkout page:", error);
        res.redirect("/pageNotFound");
    }
};

const getCheckoutPage= async (req,res)=>{
    const userId=req.session.user;
    const userData=await User.findById(userId); 
    if(req.session.checkoutData){
       const addressData=  await Address.findOne({ userId:userId});
        if(!addressData)
            console.log("cant fetch user address");
        res.render("checkout", {user:userData,addressData:addressData,checkoutData:req.session.checkoutData});
    }else{
       console.log( "checkout failed");

    }
}
//----------------------------add Addressat checkout----------------
const addAddressCheckOutForm =async (req,res)=>{
    const id=req.session.user; 
    
           res.render('addAddressCheckOut',{user:id});           
}

const SaveCheckoutAddress=async(req,res)=>{
    try {
        const id=req.session.user;          
        const userData=await User.findById(id);
     
        const {addressType,name,address,city,landmark,state,pincode,phone,altPhone} =req.body;
     
     
        const addressData= await Address.findOne({userId:userData._id});
        if(!addressData){
            console.log("address not added");
             const newAddress= new Address({
            userId:userData._id,
            address:[{addressType,name,address,city,landmark,state,pincode,phone,altPhone}]
            });
            await newAddress.save();            
        }
        else{
           
            addressData.address.push({addressType,name,address,city,landmark,state,pincode,phone,altPhone});
           await addressData.save();            
        }
        
         res.redirect('/checkout');
        
    } catch (error) {
        console.log("address not submitted",error);
        res.status(500).redirect('/pageNotFound');
    } 
    
}

//-----------------applycoupon-------------
const applyCoupon =async(req,res)=>{
    try {
        const userId=req.session.user;
        const {couponCode,orderTotal}=req.body;
      
        const coupon= await Coupon.findOne({couponCode:couponCode.trim()});
        if (!coupon || !coupon.isActive || coupon.expireOn < new Date()){
            console.log('invalid or expired Coupon');
            return res.json({success: false,message:"Invalid coupon"})
        }
        if(orderTotal<coupon.minimumPrice){
            console.log('oupon applies only with the required minimum purchase');
            return res.json({success: false,message:"Coupon applies only with the required minimum purchase"})
        }
        const user = await User.findById(userId);
        if(req.session.coupon){
            if(req.session.coupon.code===couponCode){
                console.log("You have already used this coupon.");
                return res.json({ success: false, message: "You have already used this coupon." });
            }    
        }
        if (user.usedCoupons.includes(coupon._id)) {
            return res.json({ success: false, message: "You have already used this coupon." });
        }       
       
        req.session.coupon = {
            code: coupon.couponCode,
            discount: coupon.discountValue
        };
       
        const discountAmount = coupon.discountValue;
        res.json({ success: true, discountCoupon: req.session.coupon,message: "Coupon applied " });

    } catch (error) {
        console.error("Error applying coupon:", error);
        res.json({ success: false, message: MESSAGE.SERVER_ERROR });
    }
}





module.exports={
    loadCheckoutPage,
    addAddressCheckOutForm,
    SaveCheckoutAddress,
    applyCoupon,
    getCheckoutPage
}