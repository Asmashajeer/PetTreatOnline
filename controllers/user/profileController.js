
const User= require('../../models/userSchema');
const Address= require('../../models/addressSchema');
const Order= require('../../models/orderSchema');
const Wishlist= require('../../models/wishlistSchema');
const Wallet = require('../../models/walletSchema');
const bcrypt= require('bcrypt');
const moment =require('moment');

const { generateOtp,
    sendVerificationEmail,
    securePassword} = require('../../helpers/utils');

    

//-----------------forgot password-----------
const   forgotPassword    = async (req,res)=>{
    res.render('forgotPassword');
}
//--------------send OTP to verify email-------
const verifyEmailResetPassword =async (req,res)=>{
    try {
            const {email}=req.body;
            const findUser=await User.findOne({email:email});
            if(!findUser){
                return res.render('forgotPassword',{message:'user Not found with this email'});
            }
            const otp=generateOtp();
            const emailSent= await sendVerificationEmail(email,otp);
            if(!emailSent){
                return res.render('forgotPassword',{message:'Error sending email,try again'});
            }
            req.session.userOtp=otp;
            req.session.userData=findUser;
            console.log('\nOTP Sent  :',otp)                
            res.render('verifyOtpResetPassword');    
    } catch (error) {
        console.error("server error",error);
        return res.redirect('/pageNotFound');
    }
}
//-------------verify OTP toreset Password----------------
const verify_OtpResetPassword=async(req,res)=>{
    try {
            console.log("otp entered ",req.session.userOtp);
            const {otp}=req.body;

            if(otp===req.session.userOtp){
                console.log("otp varified");
                 res.json({success:true,redirectUrl:'/resetPassword'});
            }
            else{
                res.status(400).json({success:false,message:'Invalid OTP  please tryagain'});
            }
    } catch (error) {
        
    }
}

//-----reset Password--------------

const resetPasswordPage=async(req,res)=>{
    res.render('resetPassword');
}

const resetPassword=async(req,res)=>{
    try {
            const user=req.session.userData;
            const {newPassword,confirmPassword}= req.body;
            console.log(newPassword,confirmPassword);
            const secpassword=await securePassword(newPassword);
            if(secpassword){
                console.log(secpassword);
                const resetPassword= await User.updateOne({_id:user._id},{$set:{password:secpassword}});
                
                if(resetPassword.modifiedCount>0){
                    console.log("password resetted !");
                    return res.redirect('/signIn');
                }else{
                    console.log("error while reseting password ");
                    return res.render('resetPassword',{message:'error while reseting password'});
                }
            }
            else{
                console.log("cant hash password");
            }
    } catch (error) {
        console.error("server error ",error);
        return res.status(500).redirect('/pageNotFound');
    }
}


//------  profile--------
const userProfile= async(req,res)=>{
    const selectedTab = req.query.tab || 'profile';
    
    const userid=req.query.id;
    const id=req.session.user;
    const userData=await User.findById({_id:id});  
    let referralCode= "";
    if(userData){
       const addressData= await Address.findOne({userId:userData._id});  //---Addresses 
       let page=1;
            if(req.query.page){
                page=req.query.page;            
            }
            let limit=5;
            let count=0;  
        const order= await Order.find({userId:userData._id}) .sort({createdOn:-1})
                             .limit(limit*1)
                             .skip((page-1)*limit)
                             .exec();  //---orders 
                          
         count=await Order.find({userId:userData._id}).countDocuments();   
         const orderData={
            orders:order,
            totalPages:Math.ceil(count/limit),
            currentPage:page,

         }  
        
        const wishlist= await Wishlist.findOne({userId:userData._id}) 
        .populate({
            path: 'products.productId',
            populate: {
                path: 'category'            }
        });//---wishlist
        const wallet=await Wallet.findOne({userId:userData._id}); 
        console.log(wallet);
        if(userData.referralCode){
          referralCode= userData.referralCode;
         }
           
       res.render('profile',{user:userData,selectedTab,userAddress:addressData,orderData:orderData,wishlist:wishlist,wallet:wallet,moment,referralCode,cartSize:req.session.cartSize,wList:req.session.wList});      
    }else{
       console.error("unable to fetch user data");
    }
}


//--------------- Add address of user---------------
const addAddressForm =async (req,res)=>{
    const id=req.session.user; 
           res.render('addAddress',{user:id});           
}


const SaveAddress=async(req,res)=>{
    try {
        const id=req.session.user;          
        const userData=await User.findById(id);
        console.log(id);
        const {addressType,name,address,city,landmark,state,pincode,phone,altPhone} =req.body;
        console.log("-------------------");
        console.log(addressType,name,address,city,landmark,state,pincode,phone,altPhone);
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
            console.log("address have address,add,more");
            addressData.address.push({addressType,name,address,city,landmark,state,pincode,phone,altPhone});
           await addressData.save();            
        }
        
         res.redirect('/profile?tab=addresses');
        
    } catch (error) {
        console.log("error:address not submitted");
        res.status(500).redirect('/pageNotFound');
    } 
    
}
    
        


//-------edit Address------------------
const editAddressPage=async (req,res)=>{
    try { 
        const addressId=req.query.id;        
        const user= req.session.user;
        const currentAddress=await Address.findOne({'address._id':addressId});        
        if(!currentAddress){
            return res.redirect('/pageNot Found');
        }

        const addressData=currentAddress.address.find((item)=>{
            return item._id.toString()===addressId.toString();
        }) 
        if(!addressData){
            console.log("no address data");
            res.redirect("/pageNotFound");
        }    
        res.render('editAddress',{address:addressData,user:user});
    } catch (error) {
        console.log("error fetching address:",error);
        res.status(500).redirect("/pageNotFound");
    }
}


const editAddress=async (req,res)=>{
    try {
        const addressId=req.query.id;
        console.log(addressId);
        const userId= req.session.user;
        
        const data =req.body;
        console.log(data);
        const findAddress=await Address.findOne({'address._id':addressId});
        if(!findAddress){
            console.log(findAddress);
            return res.redirect("/pageNotFound");
        }
        const changedAddress=await Address.updateOne({'address._id':addressId},{$set:{
            'address.$':{
                addressType:data.addressType,
                name:data.name,
                address:data.address,
                city:data.city,
                landmark:data.landmark,
                state:data.state,
                pincode:data.pincode,
                phone:data.phone,
                altPhone:data.altPhone
            }         
        }});

        if(changedAddress){
            res.redirect('/profile?tab=addresses');
        }else{           
            console.log("udpation failed"); 
            return res.redirect('/pageNotFound');
        }    
    } catch (error) {
        console.log("error fetching address:",error);
        res.redirect('/pageNotFound');
    }
}

//--------------delete Address-----------
const deleteAddress =async(req,res)=>{
    try {
        const addressId=req.query.id;
        console.log(addressId);
        const userId= req.session.user;    
        const findAddress=await Address.findOne({'address._id':addressId});
        if(!findAddress){
            console.log("address not found");
            return res.redirect("/pageNotFound");
        }
        console.log(findAddress);
        const changedAddress=await Address.updateOne({'address._id':addressId},
            {$pull:{address:{_id:addressId}} }
        );
        console.log(changedAddress);
        if(changedAddress>0){
            console.log("updated successfully");
        }else{
            console.log("Address not found");
        }
        res.redirect('/profile');

    } catch (error) {
        console.errror("error deleting address:",error);
        res.redirect('/pageNotFound');
    }
}

//--------------change Email---------------------
const changeEmail= async(req,res)=>{
            res.render('changeEmailprompt');           
}

//---------verify Password--------------
const verifyPassword= async(req,res)=>{
   try {
        const id=req.session.user;
        const {password} =req.body;
        const findUser=await User.findById({_id:id});
        console.log("userdata",findUser.password);       
        if(findUser){
            const passwordMatch= bcrypt.compare(password,findUser.password);
            if(!passwordMatch){
                console.log('password not match');
                return res.render('changeEmailprompt',{message:'Incorrect  Password'});
            }
                
            res.render('updateEmail',{email:findUser.email});
        }
        
   } catch (error) {
        console.error("error verifying password:",error);
        res.redirect('/pageNotFound');
   }
}
//---------verify Email--------------
const verifyEmail =async(req,res)=>{
    try {
        const id=req.session.user;
        const findUser=await User.findById({_id:id});
        if(findUser){
            const otp=generateOtp();
            console.log(findUser.email,otp);
            const emailSent = await sendVerificationEmail(findUser.email,otp);
            if(!emailSent){
                console.log("error sending otp");
                return res.render('updateEmail',{email:email,message:'error sending otp'});
            }
   
            req.session.userOtp=otp;
            req.session.userData=findUser;
            // req.session.email=email;
            res.render('emailVerify_otp');
            console.log('OTP Sent',otp);
        }else{
            console.log("user email not found");
            res.redirect('/changeEmailprompt');
        }
        
    } catch (error) {
        console.error("error error sending OTP:",error);
        res.redirect('/pageNotFound');
    }
}


//-------------------updateEmail--------------
const updateEmailpage= async(req,res)=>{
        const id=req.session.user;
        const user=await User.findById(id);
        res.render('updateEmail',{email:user.email});
}

const updateEmail= async(req,res)=>{
    console.log("reached backend");
     const id= req.session.user;
     const findUser=await User.find({_id:id});   
     const {email}=req.body;
     console.log(email);
     const checkExist= await User.findOne({email:email});
     if(checkExist){
        console.log("the new email entered already exist");
        return res.render('updateEmail',{email:email,message:'this entered email already exist'});
     }
     const otp=generateOtp();
     console.log(email,otp);
     const emailSent = await sendVerificationEmail(email,otp);
     if(!emailSent){
        console.log("error sending otp");
        return res.render('updateEmail',{email:email,message:'error sending otp'});
    }
   
    req.session.userOtp=otp;
    req.session.userData=findUser;
    req.session.email=email;
    res.render('emailVerify_otp');
    console.log('OTP Sent',otp);
}
//----------------verify OTP--------------
const verifyEmailOtp= async(req,res)=>{
    try{
        const {otp}=req.body;
        console.log(otp);
        console.log("sessionOtp:",req.session.userOtp);
        if(otp===req.session.userOtp){
            const id=req.session.user
            if(!req.session.email){
                return res.json({success:true,redirectUrl:'/updateEmail'});               
            }
            console.log("new email",req.session.email);
           const updateEmail=await User.updateOne({_id:id},{$set:{email:req.session.email}})
            if(updateEmail.modifiedCount>0){
              return  res.json({success:true,redirectUrl:'/profile'})
            }else{
                console.log("email.not updated");
               return res.redirect('/updatEmail');
            }                        
             
        }else{
            res.status(400).json({success:false,message:'Invalid OTP  please tryagain'});

        }
    }catch(error){
        console.log("Error verifying OTP", error);
        res.status(500).json({success:false,message:'ann Error occured'})
    }
}

//-------resendOTP-----------------
const resendOtp= async (req,res)=>{
    try {
       
        // if(!email){
          
        //     return res.status(400).json({success:false,message:'Email not found in session'});
        // }

        const otp=generateOtp();
        req.session.userOtp=otp;
        if(!req.session.email){
          const  email=req.session.userData.email;            
        }else{
            const {email}=req.session.email;
        }     
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
//----------------------change passsword-------------
const changePasswordPage =async (req,res)=>{
    try {
        const id= req.session.user;
        const user=await User.findById(id);
            res.render('changePassword',{user:user});

    } catch (error) {
        console.log("change password page loading error",error);
        res.redirect('/pageNotFound');
    }
}

const updatePassword =async (req,res)=>{
    try {
        const id= req.session.user;
        const {currentpassword,newpassword,confirmpassword}=req.body;
        console.log("-----------------",req.body);
       console.log(id);
        if(newpassword!==currentpassword)
        {    
            const findUser= await User.findById({_id:id});
            //console.log(findUser);
            if(findUser){
                const passwordMatch=await  bcrypt.compare(currentpassword,findUser.password);
                console.log("match:",passwordMatch);
                if(!passwordMatch){
                   return res.render('changePassword',{message:'currentpassword not match'}); 
                }
                const secuPassword=await securePassword(newpassword);
                if(!secuPassword){
                    return res.render('changePassword',{message:"hashing of password faILED"})
                }
                console.log("secu  ",secuPassword);
                const updatePass=await User.updateOne({_id:id},{$set:{password:secuPassword}});
                if(updatePass.modifiedCount>0){
                    console.log("password Updated!");
                    res.redirect('/profile');
                }else{
                    console.log("ERROR:PASSWORD UPDATION FAILED");
                    return res.render('changePassword',{message:'error while updating password '}); 
                }
            }

        }
        
    } catch (error) {
        console.log("change password page loading error",error);
        res.redirect('/pageNotFound');
    }

}

// ------------generate referal code---------------
const generateReferalCode= async(req,res)=>{
    let refCode=req.params.refCode;    
    const userId=req.session.user;
    const user = await User.findById({_id:userId});
    if(user.referralCode){
        console.log(user.referralCode);
        refCode=user.referralCode;
    }else{
        await User.updateOne({_id:userId},{$set:{referralCode:refCode}});
    }   
    return res.status(200).json({succes:true,referralCode:refCode});
    
}
module.exports={
    forgotPassword,
    verifyEmailResetPassword,
    verify_OtpResetPassword,
    resetPasswordPage,
    resetPassword,
    userProfile,
    addAddressForm,
    SaveAddress,   
    editAddressPage,
    editAddress,
    deleteAddress,
    changeEmail,
    verifyPassword,
    updateEmailpage,
    updateEmail,
    verifyEmailOtp,
    resendOtp,
    verifyEmail,
    changePasswordPage,
    updatePassword,
    
    generateReferalCode

}