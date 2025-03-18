const User= require('../../models/userSchema');
const Wallet = require('../../models/walletSchema');
const Razorpay = require('razorpay');
const bodyParser= require('body-parser');
const crypto=require('crypto');
const {generateReceiptNumber}=require('../../helpers/utils');
const env =require('dotenv').config();
const moment =require('moment');

const razorpay = new Razorpay({
    key_id:process.env.RAZORPAY_KEY_ID,
    key_secret:process.env.RAZORPAY_KEY_SECRET
})


const topUp= async(req,res)=>{
    try{
        const userId=req.session.user;
        const{amount}=req.body;
        console.log(amount);
        const userData= await User.findById(userId);       
            const options = {
                amount: amount*100, 
                currency:'INR',
                receipt:generateReceiptNumber(),
            };
        console.log(options);
        const razorPaytopUp = await razorpay.orders.create(options);
        console.log(razorPaytopUp);
        res.json({ sucess:true,topUp:razorPaytopUp,user:userData});
    } catch (error) {
        res.status(500).json({ message: 'Razorpay payment failed', error });
    }
}




//------------------payment Verification-------------
const  verifyPayment=async (req,res)=>{
    try{
        const userId=req.session.user;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        console.log( razorpay_order_id, razorpay_payment_id, razorpay_signature );
        console.log('razorpay_signature  :',razorpay_signature);
        console.log('amount  :',amount);
        const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generatedSignature = hmac.digest("hex");       
        console.log('generatedSignature  :',generatedSignature);
        if(generatedSignature.trim() === razorpay_signature.trim()) {
            console.log("topup successfull");
            let transaction={
                    transactionType:'Credit',      
                    amount:amount/100,
                    description:'TopUp'
                };
                //-----add to wallet
                const topUp= await Wallet.updateOne(
                    {userId:userId},
                    {
                        $push:{transactions:transaction},
                        $inc:{walletAmount:amount}
                    },{ upsert: true });
                console.log(topUp);
                
                if(!topUp){
                    console.log('Error:updating wallet failed'); 
                }
                res.json({ success:true,message: 'Wallet topped up successfully', wallet:topUp});
        
        } else { 
            console.log("Invalid payment signature.")         ;
            res.status(400).json({ success: false, message: "'Invalid payment signature. " });          

        }

    }catch(error){
        res.status(500).json({message:'Payment vrification failed',error:error.message})
    }
}



module.exports={
    topUp,
    verifyPayment
}