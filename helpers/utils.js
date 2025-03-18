
const nodemailer =require('nodemailer');
const bcrypt= require('bcrypt');
const env =require('dotenv').config();
const crypto=require('crypto');
const Ledger= require('../models/ledgerSchema');


//-------------secure Password----------
const securePassword= async(password)=>{
    try{
         const secPassword=await bcrypt.hash(password,10)
         return secPassword;
        
    } catch (error) {
        console.log("ERROR WHILE HASHING OF PASSWORD");
        return false;
    }

    }

function generateOtp(){
    return String(Math.floor(100000 + Math.random() *900000));
}

//--------to send email verification-----------
const sendVerificationEmail=async function(email,otp){
    try{
        const transporter =nodemailer.createTransport({
             host:'smtp.gmail.com',
             port:587,
             secure:false,
            //  require:true,
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

//------------------generate recept Number-----------------
function generateReceiptNumber(prefix = "REC", length = 10) {
    const randomBytes = crypto.randomBytes(length);
    const receiptNumber = randomBytes.toString('hex').toUpperCase().slice(0, length);
    return `${prefix}-${receiptNumber}`;
}


//-----------generate Invoice Number------------
function generateInvoiceNumber(orderId) {
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    return `INV-${orderId}-${timestamp}`;
}


//--------------add Ledger entry----------------
const addTransaction=async function (orderId,userId,transactionType,amount, paymentMethod,description){
    const newEntry=new Ledger({
        transactionId: `TXN${Date.now()}`, // Unique Transaction ID
        orderId,
        userId,
        transactionType,
        amount,
        paymentMethod: paymentMethod,
        description
    });
    await newEntry.save();
}
module.exports={
    generateOtp,
    sendVerificationEmail,
    securePassword,
    generateReceiptNumber,
    generateInvoiceNumber,
    addTransaction
}
