const Coupon = require('../../models/couponSchema');
const Order =require('../../models/orderSchema');
const Product= require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const User=require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const Category= require('../../models/categorySchema');
const Ledger= require('../../models/ledgerSchema');
const moment=require('moment');
const {STATUS_CODE,MESSAGE}=require('../../helpers/utils');


const Alltransactions=async(req,res)=>{
    try {
        let page=req.query.page ||1;
        let limit=5;
        const skip=(page-1)*limit;
        let count=0;

        let query = {};  
        let ledgerData; 
        if (req.query.dateFrom || req.query.dateTo) {
            query.createdAt = {};
            if (req.query.dateFrom) {
                query.createdAt.$gte = new Date(req.query.dateFrom);
            }
            if (req.query.dateTo) {
                query.createdAt.$lte = new Date(req.query.dateTo);
            }
        }
        if(req.query.transactionType){
            query.transactionType=req.query.transactionType;
        }
        if(req.query.paymentMethod){
            query.paymentMethod=req.query.paymentMethod;
        }
        
        if(Object.keys(query).length !== 0){
            ledgerData = await Ledger.find(query)
            .populate('userId','name')
            .sort({ createdAt: -1 });

            count = await Ledger.find(query)
            .populate('userId','name')
            .sort({ createdAt: -1 }).countDocuments();
            
        }else{
            ledgerData= await Ledger.find().populate('userId','name').sort({createdAt:-1}).skip(skip).limit(limit);
            count= await Ledger.find().sort({createrAt:-1}).countDocuments();
        }
        if(!ledgerData){
            console.log("No trasaction Data");
        }
        
        const totalPages=Math.ceil(count/limit);  
        res.render('transaction',{data:ledgerData,moment,currentPage:page,totalProducts:count,totalPages:totalPages});
    } catch (error) {
        
        console.log(MESSAGE.SERVER_ERROR,error);
    }
}



module.exports={
    Alltransactions
}