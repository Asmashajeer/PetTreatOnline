const  Product =require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');
const Wishlist = require('../../models/wishlistSchema');
const { STATUS_CODE,MESSAGE } = require('../../helpers/utils');

const addWishlist=async(req,res)=>{
    try {
        const userId=req.session.user;
        const productId=req.params.id;   
    
        const product=await Product.findById(productId); 
      

        let   wishlist= await Wishlist.findOne({userId:userId});
        if(!wishlist){
           
            wishlist= new Wishlist({
                userId:userId,
                products:[{productId}]

            });
            await wishlist.save();
            req.session.wList=wishlist.products.length;
            console.log("wishlist  added");
            return res.status(STATUS_CODE.SUCCESS).json({success:true,product:product.productName});

        }else{
            wishlist.products.forEach((product)=>{
                if(product.toString()===productId.toString()){
                    return res.status(STATUS_CODE.BAD_REQUEST).json({SUCCESS:false,message:'product is already in wishlist'});
                }
            })
            wishlist.products.push({productId});
            await wishlist.save();
            req.session.wList=wishlist.products.length;
            console.log("wishlist  added");
            return res.status(STATUS_CODE.SUCCESS).json({success:true,product:product.productName});
        }

    } catch (error) {
        console.error("unable to add to wishlist",error);
        res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({success:false,message:MESSAGE.SERVER_ERROR})
    }
}


//----------------------show Wishlist------------------------

const showWishlist = async (req,res)=>{
    try {     
        res.redirect('/profile?tab=wishlist');       
    } catch (error) {
        console.error(MESSAGE.ERR_FETCH_DATA,error);
        res.redirect('/pageNotFound');
    }
}



//--------------------------remove from wishlist-------------

const removeFromwishlist = async (req,res)=>{
    try {
        const userId=req.session.user;
        const productIdtoDelete= req.params.id;
        let wishlist= await Wishlist.findOne({userId:userId});
        const productToDelete=wishlist.products.find(product=>product.productId.toString()===productIdtoDelete.toString());
        if(!productToDelete){
            console.log("productNot foundin in wishlist");
        }
        const wishlistAfterDelete = await Wishlist.updateOne({userId:userId},
            {$pull:{products:{productId:productIdtoDelete}}}
        );
        
        if(wishlistAfterDelete.modifiedCount>0){
            console.log("product deleted from wishlist");
             wishlist= await Wishlist.findOne({userId:userId});
            req.session.wList=wishlist.products.length;
             return res.redirect('/profile?tab=wishlist');
        }else{
            console.log("product cannot  remove from wishlist");
        }       
        
    } catch (error) {
        console.error("server error while deleting from wishlist",error);
        res.redirect('/pageNotFound');
    }
}


module.exports={
    addWishlist,
    showWishlist,
    removeFromwishlist
}