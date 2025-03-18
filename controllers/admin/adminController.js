
const mongoose=require('mongoose');
const bcrypt =require('bcrypt');
const Coupon = require('../../models/couponSchema');
const Order =require('../../models/orderSchema');
const Product= require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const User=require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const Category= require('../../models/categorySchema');
const moment = require('moment'); 




const loadLogin=async (req,res)=>{
    try {
        if(req.session.admin){
           return res.redirect('/admin/dashboard');
        }
        res.render('adminLogin',{message:null});
    } catch (error) {
        console.log('error loading login page');
    }
}
  const login= async(req,res)=>{
    try {
        const {email,password}=req.body;
        const  admin= await User.findOne({email,isAdmin:true});
        if(admin){
            const passwordMatch= bcrypt.compare(password,admin.password);
            if(passwordMatch){
                req.session.admin=true;
                return res.redirect('/admin/dashboard');
            }
            else{
               return res.redirect('/login');
            }
        }
        else{
            return res.redirect('/login');
        }
        
    } catch (error) {
        console.log("login eroor",error.message);
        return res.redirect('/admin/pageError');
    }
  }

const loadDashboard=async (req,res)=>{
    try {
        if(req.session.admin){
            //---total sales--------
            let sales= await Order.find({paymentStatus:'Paid'});           
            const totalSales=sales.reduce((sum,sale)=>sum+sale.orderPrice,0);
           
            const startOfDay = moment().startOf('day').toDate(); // 00:00:00
            const endOfDay = moment().endOf('day').toDate(); // 23:59:59.999

             let salesToday = await Order.find({
                createdOn: { $gte: startOfDay, $lte: endOfDay },
                paymentStatus: 'Paid'
            });            
            const todaySales= salesToday.reduce((sum,sale)=>sum+sale.orderPrice,0);          

            
            const startOfMonth = moment().startOf('month').toDate(); // 1st of the month, 00:00:00
            const endOfMonth = moment().endOf('month').toDate(); // Last day of the month, 23:59:59.999

            const salesMonth = await Order.find({
                createdOn: { $gte: startOfMonth, $lte: endOfMonth },
                paymentStatus: 'Paid'
            });
            const monthSales = salesMonth.reduce((sum, sale) => sum + sale.orderPrice, 0);



            //---no of orders------

            const totalOrders= await Order.find().countDocuments();
            const totalOrderCompleted= await  Order.find().countDocuments({status:'Delivered'});
            const totalOrderCancelled= await  Order.find().countDocuments({status:'Cancelled'});
            const totalOrderPending = await Order.countDocuments({
                status: { $nin: ['Delivered', 'Returned', 'Cancelled'] }});            
            const totalOrderReturned= await  Order.find().countDocuments({status:'Returned'});
            const totalUsers= await User.find().countDocuments();
            const activeUsers= await User.find().countDocuments({isBlocked:false});
             const blockedUsers= await User.find().countDocuments({isBlocked:true});


             //-----no of products---
             const totalProducts= await Product.find().countDocuments({isBlocked:false});
             const productsInStock= await Product.find().countDocuments({stock:{$gt:0}});
             const productsOutofStock= await Product.find().countDocuments({stock:{$eq:0}});

            const Total={
                totalSales,
                todaySales,
                monthSales,
                totalOrders,
                totalOrderCompleted,
                totalOrderCancelled,
                totalOrderPending,
                totalOrderReturned,
                totalUsers,
                activeUsers,
                blockedUsers,
                totalProducts,
                productsInStock,
                productsOutofStock
            } ;
           
             //----------Top Selling products---------------
             const topSellingProducts= await Order.aggregate([
                {$unwind:'$orderItems'},
                {$group:{
                    _id:'$orderItems.product',
                    totalQuantitySold:{$sum:'$orderItems.quantity'}
                }},
                {$sort:{totalQuantitySold:-1}},
                {$limit:10} ,
                { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "productInfo" }},
                { $unwind: "$productInfo" },
                {$project: {
                    productName: "$productInfo.productName",
                    totalQuantitySold: 1
                    }
                }

             ] );              
            
           
             
            //------------recent orders--------
            const orders= await Order.find().populate('userId').sort({createdOn:-1}).limit(10);
           
            res.render('dashBoard',{Total,orders,moment,topSellingProducts});
        }
    } catch (error) {
        console.log('error in dashboard load',error);
        return res.redirect('/admin/pageError');
    }
    
}
const pageError=async(req,res)=>{
    res.render("pageError");
}

const logOut=async(req,res)=>{
    try {
        req.session.destroy((err=>{
            if(err){
                console.log("Erroe destroying seession",err);
                return res.redirect('/pageError');
            }
            res.redirect('/admin/login');
        }))
    } catch (error) {
        console.log("unexpected error during loggout");
        res.redirect('/pageError');
    }
}








const getChartData= async (req,res)=>{
    try {
        //---------best selling products-----------------------
        const topSellingProducts= await Order.aggregate([
            {$unwind:'$orderItems'},
            {$group:{
                _id:'$orderItems.product',
                totalQtySold:{$sum:'$orderItems.quantity'}
            }},
            {$sort:{totalQtySold:-1}},
            {$limit:10} ,
            { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "productInfo" }},
            { $unwind: "$productInfo" },
            {$project: {
                name: "$productInfo.productName",
                totalQtySold: 1
                }
            }
         ] );   
      

         //---------------Best selling categories--------------
         const topSellingCategories= await Order.aggregate([
            {$unwind:'$orderItems'},
            { $lookup: { from: "products", localField: "orderItems.product", foreignField: "_id", as: "productInfo" }},
            { $unwind: "$productInfo" },
            
            {$group:{
                _id:'$productInfo.category',
                totalQtySold:{$sum:'$orderItems.quantity'}
            }},
            {$sort:{totalQtySold:-1}},
            {$limit:10} ,
            { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "categoryInfo" }},
            { $unwind: "$categoryInfo" },
            {
                $project: {
                    categoryId: "$_id",
                    name: "$categoryInfo.name",
                    totalQtySold: 1
                }
            }
            
         ] );   
        

           //---------------Best selling brands--------------
           const topSellingBrands= await Order.aggregate([
            {$unwind:'$orderItems'},
            { $lookup: { from: "products", localField: "orderItems.product", foreignField: "_id", as: "productInfo" }},
            { $unwind: "$productInfo" },
            
            {$group:{
                _id:'$productInfo.brand',
                totalQtySold:{$sum:'$orderItems.quantity'}
            }},
            {$sort:{totalQtySold:-1}},
            {$limit:10} ,
          
            {
                $project: {
                    
                    name: "$_id",
                    totalQtySold: 1
                }
            }
            
         ] );   
         
      
         res.json({products:topSellingProducts,categories:topSellingCategories,brands:topSellingBrands});
    } catch (error) {
        
    }
}



//--------------------------------yearly chat data-------------------
const getChartData1= async (req, res) => {
    try {
        const type = req.params.type; // type = 'yearly' or 'monthly'
        console.log(type);
            let groupBy;
         if(type === "yearly") 
             groupBy ={ year: { $year: "$createdOn" } } ; 
         else if (type === "monthly")
             groupBy = { year: { $year: "$createdOn" }, month: { $month: "$createdOn" } };
         else
            groupBy={};
        //------------TOP SELLING PRODUCTS--------------
        const topSellingProducts = await Order.aggregate([
            { $unwind: "$orderItems" },
            { 
                $group: {
                    _id: { ...groupBy, product: "$orderItems.product" },
                    totalQtySold: { $sum: "$orderItems.quantity" }
                }
            },
            { $sort: { totalQtySold: -1 } },
            { $limit: 10 },
            { 
                $lookup: {
                    from: "products",
                    localField: "_id.product",
                    foreignField: "_id",
                    as: "productInfo"
                } 
            },
            { $unwind: "$productInfo" },
            { 
                $project: {
                    year: "$_id.year",
                    month: type === "monthly" ? "$_id.month" : null,
                    name: "$productInfo.productName",
                    totalQtySold: 1
                }
            }
        ]);
        console.log(topSellingProducts);
        //--------------TOP SELLING  CATEGORIES------
        const topSellingCategories = await Order.aggregate([
            { $unwind: "$orderItems" },
            { 
                $lookup: {
                    from: "products",
                    localField: "orderItems.product",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            { 
                $group: {
                    _id: { ...groupBy, category: "$productInfo.category" },
                    totalQtySold: { $sum: "$orderItems.quantity" }
                }
            },
            { $sort: { totalQtySold: -1 } },
            { $limit: 10 },
            { 
                $lookup: {
                    from: "categories",
                    localField: "_id.category",
                    foreignField: "_id",
                    as: "categoryInfo"
                }
            },
            { $unwind: "$categoryInfo" },
            { 
                $project: {
                    year: "$_id.year",
                    month: type === "monthly" ? "$_id.month" : null,
                    name: "$categoryInfo.name",
                    totalQtySold: 1
                }
            }
        ]);
        
        //--------------TOP SELLING BRANDS----------
        const topSellingBrands = await Order.aggregate([
            { $unwind: "$orderItems" },
            { 
                $lookup: {
                    from: "products",
                    localField: "orderItems.product",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            { 
                $group: {
                    _id: { ...groupBy, brand: "$productInfo.brand" },
                    totalQtySold: { $sum: "$orderItems.quantity" }
                }
            },
            { $sort: { totalQtySold: -1 } },
            { $limit: 10 },
            { 
                $project: {
                    year: "$_id.year",
                    month: type === "monthly" ? "$_id.month" : null,
                    name: "$_id.brand",
                    totalQtySold: 1
                }
            }
        ]);
        res.json({products:topSellingProducts,categories:topSellingCategories,brands:topSellingBrands});
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};
module.exports={
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logOut,
   getChartData,
    getChartData1
    
}