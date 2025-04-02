const User =require('../../models/userSchema');
const Cart =require('../../models/cartSchema');
const Wishlist = require('../../models/wishlistSchema');



async function fetchUserData(user){
    
    const userData= await User.findById(user);
    if(userData){       
        const cart= await Cart.findOne({userId:userData._id});
        cartSize=cart?cart.items.length:0;      
        const wishlist= await Wishlist.findOne({userId:userData._id});
        wList=wishlist?wishlist.products.length:0;
        console.log('user--:  ',userData,cartSize,wList);  
        return {userData,cartSize,wList};
    }
}
const aboutUs=async(req,res)=>{
   
    if(req.session.user){       
        const userId=req.session.user; 
        console.log('user:  ',userId);   
        const{userData,cartSize,wList}=await fetchUserData(userId);
       
        req.session.cartSize=cartSize;
        req.session.wList=wList; 
        return  res.render('about',{user:userData,cartSize,wList});         
         
    }      
    res.render('about');
}


//----------------contact Us----------
const contactUs=async(req,res)=>{
    if(req.session.user){       
        const userId=req.session.user; 
        console.log('user:  ',userId);   
        const{userData,cartSize,wList}=await fetchUserData(userId);
       
        req.session.cartSize=cartSize;
        req.session.wList=wList; 
        return  res.render('contactUs',{user:userData,cartSize,wList});         
          
    }      
    res.render('contactUs');
}

module.exports={
    aboutUs,
    contactUs
}