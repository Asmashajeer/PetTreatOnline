const { STATUS_CODE,MESSAGE } = require('../../helpers/utils');
const  Coupon = require('../../models/couponSchema');



//----------------show coupons-----------------
const loadCoupon = async(req,res)=>{
    try {
        const page= req.query.page || 1;                      
        const limit=4;
        const skip=(page-1)*limit;
        const allCoupons= await Coupon.find({}).skip(skip).limit(limit*1).exec(); 
        console.log(allCoupons);
        const count= await Coupon.find({}).countDocuments();  
        console.log(count);
        const totalPages=Math.ceil(count/limit); 

        return res.render('coupons',{coupons:allCoupons,currentPage:page,totalProducts:count,totalPages:totalPages});
        
    } catch (error) {
        console.log(error);
        return res.redirect('/admin/pageError');
    }
   
}

//-----------------Create coupon------------
const createCoupon =async(req,res)=>{
    try {
     
        const {couponCode,startOn,expireOn,discountValue,minimumPrice}=req.body;
        console.log(couponCode,startOn,expireOn,discountValue,minimumPrice);

        const allCoupons= await Coupon.find({});
      
        const cCode =couponCode.toUpperCase();
        const existingCoupon = await Coupon.findOne({ couponCode:cCode });
        if (existingCoupon) {
            console.log("Coupon Code already exists");
            return res.status(STATUS_CODE.BAD_REQUEST).json({error:'Coupon already exist'});   
        }
        
        const startDate = new Date(startOn);
        const expireDate = new Date(expireOn);
        const newCoupon =new Coupon({                            
            couponCode:cCode,
            startOn:startDate,
            expireOn:expireDate,
            discountValue,
            minimumPrice
       });
     
        const couponAdded = await newCoupon.save();
        res.status(STATUS_CODE.SUCCESS).json ({message:"Coupon created successfully  "});

        console.log("coupon Added");
         
    } catch (error) {
        console.log("error creating coupon",error);
        res.status(500).json({error:'Internal server error'});
    }
}


//---------------edit coupon--------------------
const editCoupon= async(req,res)=>{
    try {
        
         const id= req.params.id;
         const findCoupon = await Coupon.findById(id);
         if(!findCoupon){
            console.log(" Coupon not found");
            return res.redirect('/pageError');
         }
        return res.render('editCoupon',{coupon:findCoupon});

    } catch (error) {
        console.log(" Coupon not found",error);
            return res.sataus(500).redirect('/pageError');
    }
}
//----updating coupon-------------
const updateCoupon= async(req,res)=>{
    try {
        const id= req.params.id;
        console.log(id);
        const {couponCode,startOn,expireOn,discountValue,minimumPrice}=req.body;
        let cCode=couponCode.toUpperCase();
        const startDate = new Date(startOn);
        const expireDate = new Date(expireOn);
        const existingCoupon= await Coupon.findOne({couponCode:cCode});
        if(existingCoupon){
           return  res.status(STATUS_CODE.BAD_REQUEST).render('editCoupon',{coupon:existingCoupon,message:"Coupon Code already  exist please enter another name"});
        }
       const updatedCoupon= await Coupon.findByIdAndUpdate(id,
            {couponCode:cCode,
            startOn:startDate,
            expireOn:expireDate,
            discountValue,
            minimumPrice},{new:true});
        if(updatedCoupon)
           return  res.redirect('/admin/coupons');
        else
            res.status(STATUS_CODE.NOT_FOUND).json({error:"coupon not found"});

    } catch (error) {
        res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({error:MESSAGE.SERVER_ERROR});
    }
    
}
//------------------delete coupon-----------------
const deleteCoupon=async(req,res)=>{
    try {
        console.log('---------------');
        const id=req.params.id;
        console.log(id);
        const findCoupon = await Coupon.findById(id);
        console.log(findCoupon);
        if(!findCoupon){
            console.log(" Coupon not found");
            return res.redirect('/pageError');
        }
        await Coupon.deleteOne({_id:id});
        
        console.log("coupon Removed successfully");
        return res.redirect('/admin/coupons');
    } catch (error) {
        console.log("Error while deleting  Coupon ",error);
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).redirect('/pageError');
    }
    
    
}




module .exports={
    loadCoupon,
    createCoupon,
    editCoupon,
    updateCoupon,
    deleteCoupon
}