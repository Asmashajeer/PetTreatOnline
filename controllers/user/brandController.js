const  Brand =require('../../models/brandSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');



//-----------------loading Brand Listing Page------------

const getBrand=async(req,res)=>{
    const userId= req.session.user;
    const userData= await User.findById(userId);
    const categories= await Category.find({isListed:true});
    const brandData=await Brand.find({isBlocked:false}).sort({brandName:1});
    
    if(brandData){
        res.render('brand',{user:userData,category:categories,brands:brandData});
    }else{
        console.log("error fetchung brands");
    }
}


module.exports={
    getBrand
}