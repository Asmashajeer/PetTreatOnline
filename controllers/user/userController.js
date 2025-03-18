const User= require('../../models/userSchema');
const Category=require('../../models/categorySchema');
const Brand =require('../../models/brandSchema');
const Product=require('../../models/productSchema');
const Address= require('../../models/addressSchema');
const Wallet = require('../../models/walletSchema');
const Wishlist = require('../../models/wishlistSchema');
const ReferralOffer= require('../../models/referralOfferSchema');
const {addTransaction}=require('../../helpers/utils');
const nodemailer =require('nodemailer');
const env =require('dotenv').config();
const bcrypt= require('bcrypt');
const Cart = require('../../models/cartSchema');
const { session } = require('passport');

//------ to generate  OTP-------
function generateOtp(){
    return String(Math.floor(100000 + Math.random() *900000));
}
async function addRewards(referralcode,userId){
    
    const findReferer= await User.findOne({referralCode:referralcode});
    const reward=await ReferralOffer.findOne();
    const user=await User.findById(userId);
    console.log(reward);
    let transaction={
        transactionType:'Credit',      
        amount:reward.refererAmount,
        description:`Referral reward credited for referring User - ${user}` 
    };
    //-----add reward to referer
    const refererReward= await Wallet.updateOne(
        {userId:findReferer._id},
        {
            $push:{transactions:transaction},
            $inc:{walletAmount:reward.refererAmount}
        },{ upsert: true });
    console.log(refererReward);

    
    addTransaction(refererReward._id,findReferer._id,'Credit',transaction.amount, 'Referal',transaction.description);
    if(!refererReward){
        console.log('Error:reward cannot add to referrer'); 
    }
    console.log('reward added to referrer'); 
    
    let transactions={
        transactionType:'Credit',      
        amount:reward.refereeAmount,
        description:`Referral reward credited for signing up with referral`
    };

    const refereeReward=new Wallet({
        userId:userId,
        transactions,
        walletAmount:reward.refereeAmount
    })
    await refereeReward.save(); 
    
    addTransaction(refereeReward._id,userId,'Credit',transaction.amount, 'Referal',transaction.description);   
    console.log('reward added to referreee'); 
}


//--------to send email verification-----------
const sendVerificationEmail=async function(email,otp){
    try{
        const transporter =nodemailer.createTransport({
             host:'smtp.gmail.com',
             port:587,
             secure:false,
             require:true,
             auth:{
                user:process.env.EMAIL_USER,
                pass:process.env.EMAIL_PASSWORD
             }
        })
            
        
        const info = await transporter.sendMail({
            from:process.env.EMAIL_USER,
            to:email,
            subject:'Verify your account',
            text:`Your OTP is ${otp}`,
            html:`<p>Your OTP:${otp}</p>`
             });
            return info.accepted.length>0
    }
    catch(error){
        console.log(`Error sending email`);
        return false;
    }
}

//-------------secure Password----------
const securePassword= async(password)=>{
    try{
         const secPassword=await bcrypt.hash(password,10)
         return secPassword;
        
    } catch (error) {
        
    }

    }



// ------Load Home Page-------------
const loadHomePage =async (req,res)=>{
    try{
      
        const user=req.session.user;
        let cartSize=0;
        let wList=0;
       
        if(user){
                const userData= await User.findOne({_id:user})
                const cart= await Cart.findOne({userId:userData._id});
                cartSize=cart?cart.items.length:0;                 
                req.session.cartSize=cartSize;
                const wishlist= await Wishlist.findOne({userId:userData._id});
                wList=wishlist?wishlist.products.length:0;
                req.session.wList=wList;

        }        
        const {categoryId}= req.query;
       
        const limit=8;
    
        const categories= await Category.find({isListed:true});
        const query={
            isBlocked:false,
            stock:{$gt:0}
        }; 
       
               
       if(categoryId){
            query.category=categoryId;
        }  
        const productData=await Product.find(query).populate('category').sort({createdAt:-1}).limit(limit);
       
         //-----for ajax call-------------------   
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    // If AJAX request, send products as JSON          
                    return res.json(productData);
                }
                 
                if(user){
                    const userData= await User.findOne({_id:user})
                   return  res.render('home',{user:userData,products:productData,category: categories,cartSize,wList});            
                }else{
                  
                    return res.render('home',{products:productData,category: categories,cartSize,wList});
                }  
        
            
    }catch(error){
        console.log('Home page not found srver Error',error);
        res.status(500).redirect("/pageNotFound");
    }
}


//--------------404Page not Found----------
const pageNotFound = async(req,res)=>{
    try{
            res.render('page_404');
    }catch(error){
        res.redirect('/pageNotFound');
    }
}

//---------------Load signup Page-----------
const loadSignUp=async(req,res)=>{
  try{
    res.render('register');
  }
  catch(error){
    console.log('SignUp page not loading : ',error);
    res.status(500).send('Server Error');
  }
}




//--------register user--------------
const createUser = async (req,res)=>{   
    try{
            const {name,email,password,confirmPassword,referralcode}=req.body;
           
            console.log(req.body);
            console.log(email);
           
            
            const findUser = await User.findOne({email:email});
            if(findUser){
                return  res.render('register',{message:'user already registered with this email'});
             }
             
             if(referralcode){
                const findReferer= await User.findOne({referralCode:referralcode});
                if(!findReferer){
                    return  res.render('register',{message:"Invalid ReferralCode"});
                }
                req.session.referralcode=referralcode;
             }
            const otp= generateOtp();
            console.log(`otp generated`);
            const emailSent = await sendVerificationEmail(email,otp);
            console.log(emailSent);
            if(!emailSent){
                return  res.render('register',{message:"Email Error"});
            }
            
            req.session.userOtp=otp;
            req.session.userData={name,email,password};
            res.render('verify_otp');
            console.log('OTP Sent',otp);
               
        }catch(error){
        console.error('error while creating user:',error);
        res.redirect("/pageNotFound");
    }
}





//-------------verify OTP-------------
const verifyOtp= async(req,res)=>{
    try{
        const {otp}=req.body;
        console.log(otp);
        if(otp==req.session.userOtp){
            const user=req.session.userData
            console.log(`password  -${user.password}`);
            const secPassword = await securePassword(user.password);
            
            const saveUserData= new User({
                name:user.name,
                email:user.email,
                password:secPassword
             });
             await saveUserData.save();             
             req.session.user=saveUserData._id;
             if(req.session.referralcode){
                addRewards(req.session.referralcode,saveUserData._id);
             }   
             res.json({success:true,redirectUrl:'/'})
        }else{
            res.status(400).json({success:false,message:'Invalid OTP  please tryagain'});

        }
    }catch(error){
        console.log("Error verifying OTP", error);
        res.status(500).json({success:false,message:'ann Error occured'})
    }
}


const resendOtp= async (req,res)=>{
    try {
        const {email}=req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:'Email not found in session'});
        }

        const otp=generateOtp();
        req.session.userOtp=otp;
        const emailSent = await sendVerificationEmail(email,otp);
       
        if (emailSent){
            console.log("Resend OTP",otp);
            res.status(200).json({success:true,message:'OTP resend successfully'});
        }else{
            res.status(500).json({success:false,message:'Failed to resend OTP please try again'});
        }
    } catch (error) {
        console.error('Error resending OTP',error);
        res.status(500).json({success:false,message:'Internal Server Error please try Again'});
    }
}


//  -----------user login----------
const loadSignIn= async (req,res)=>{
  try {
        if (!req.session.user){
          return  res.render('signIn');
        }else{
            res.redirect('/');
        }
  } catch (error) {
    res.redirect('pageNotFound');
  }
}


const signIn= async (req,res)=>{
    try {
         const{email,password}=req.body;
         const findUser=await User.findOne({isAdmin:0,email:email});
         
         if(!findUser){
           return res.render('signIn',{message:'user not found'})
         }if(findUser.isBlocked){
           return  res.render('signin',{message:'user is blocked by Admin'});
         }
        const passwordMatch= bcrypt.compare(password,findUser.password);
        if(!passwordMatch){
           return  res.render('signIn',{message:'incorrect  credentials'});
        }
        req.session.user=findUser._id;        
        res.redirect('/');

    } catch (error) {
         console.log('Signin error');
         res.render('signIn',{message:'incorrect  credentials'});
    }
}


//----------user logout----------------------------

const logout= async(req,res)=>{
    try {
       
            req.logout((err) => { // Logs the user out of your app
                if (err) {
                    console.log("Error during logout", err.message);
                    return res.redirect('/pageNotFound');
                }else{
                    req.session.destroy((err)=>{
                        if(err){
                            console.log("session destruction error",err.message);
                            return res.redirect('/pageNotFound');
                        }else{
                             return res.redirect('/signIn');
                        }
                    })
                }    
            });
    } catch (error) {
            console.log('Logout error');
            res.redirect('/pageNotFound');
    }
}

module.exports ={
    loadHomePage,
    pageNotFound,
    loadSignUp,
    createUser,
    verifyOtp,
    resendOtp,
    loadSignIn,
    signIn,
    logout,
    
    

}