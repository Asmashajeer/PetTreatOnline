
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
const {STATUS_CODE,MESSAGE}=require('../../helpers/utils');




const loadLogin=async (req,res)=>{
    try {
        if(req.session.admin){
           return res.redirect('/admin/dashboard');
        }
        res.render('adminLogin',{message:null});
    } catch (error) {
        console.log('error loading login page',error);
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).redirect('/login');
    }
}
  const login= async(req,res)=>{
    try {
        const {email,password}=req.body;
        const  admin= await User.findOne({email,isAdmin:true});
        console.log(admin);
        if(admin){
            const passwordMatch=await bcrypt.compare(password,admin.password);
            if(passwordMatch){
                console.log(password);
                console.log(passwordMatch);
                req.session.admin=true;
                return res.status(STATUS_CODE.SUCCESS).redirect('/admin/dashboard');
            }
            else{
               return res.status(STATUS_CODE.NOT_FOUND).render('adminLogin',{message:MESSAGE.ERR_AUTH});
            }
        }
        else{
            return res.status(STATUS_CODE.BAD_REQUEST).render('adminLogin',{message:MESSAGE.ERR_AUTH});
        }
        
    } catch (error) {
        console.log("login error",error.message);
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).redirect('/admin/pageError');
    }
  }

const loadDashboard=async (req,res)=>{
    try {
        if(req.session.admin){
            const startOfDay = moment().startOf('day').toDate(); // 00:00:00
            const endOfDay = moment().endOf('day').toDate(); // 23:59:59.999
            const startOfMonth = moment().startOf('month').toDate(); // 1st of the month, 00:00:00
            const endOfMonth = moment().endOf('month').toDate(); // Last day of the month, 23:59:59.999

             // Run all queries in parallel
            const [
                sales, // Sales data for total sales
                salesToday, // Sales data for today
                salesMonth, // Sales data for this month
                totalOrders, // Total orders count
                totalOrderCompleted, // Completed orders count
                totalOrderCancelled, // Cancelled orders count
                totalOrderPending, // Pending orders count
                totalOrderReturned, // Returned orders count
                totalUsers, // Total users count
                activeUsers, // Active users count
                blockedUsers, // Blocked users count
                totalProducts, // Total products count
                productsInStock, // Products in stock
                productsOutofStock // Products out of stock
            ] = await Promise.all([
                Order.find({ paymentStatus: 'Paid' }), // All paid orders for total sales
                Order.find({
                    createdOn: { $gte: startOfDay, $lte: endOfDay },
                    paymentStatus: 'Paid'
                }),                // Paid orders for today
                Order.find({
                    createdOn: { $gte: startOfMonth, $lte: endOfMonth },
                    paymentStatus: 'Paid'
                }),
                 // Paid orders for the month
                Order.countDocuments(), // Total orders count
                Order.countDocuments({ status: 'Delivered' }), // Completed orders count
                Order.countDocuments({ status: 'Cancelled' }), // Cancelled orders count
                Order.countDocuments({
                    status: { $nin: ['Delivered', 'Returned', 'Cancelled'] }
                }),
                 // Pending orders count
                Order.countDocuments({ status: 'Returned' }), // Returned orders count
                User.countDocuments({isAdmin:false}), // Total users count
                User.countDocuments({ isBlocked: false,isAdmin:false }), // Active users count
                User.countDocuments({ isBlocked: true }), // Blocked users count
                Product.countDocuments({ isBlocked: false }), // Total products count
                Product.countDocuments({ stock: { $gt: 0 } }), // Products in stock
                Product.countDocuments({ stock: { $eq: 0 } }) // Products out of stock
            ]);
        
            // Calculate total sales
            const totalSales = sales.reduce((sum, sale) => sum + sale.orderPrice, 0);
        
            // Calculate today sales
            const todaySales = salesToday.reduce((sum, sale) => sum + sale.orderPrice, 0);
        
            // Calculate month sales
            const monthSales = salesMonth.reduce((sum, sale) => sum + sale.orderPrice, 0);
        
            // Create the total object
            const Total = {
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
            };
        
           
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
        console.log(MESSAGE.ERR_FETCH_DATA,error);
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).redirect('/admin/pageError');
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
                res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).redirect('/pageError');
            }
            res.redirect('/admin/login');
        }))
    } catch (error) {
        console.log(MESSAGE.UNEXP_ERR,error);
        res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).redirect('/pageError');
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
        ConsoleMessage.LOG(MESSAGE.SERVER_ERROR,error);
        res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).redirect('/pageError');
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
        console.error(MESSAGE.SERVER_ERROR,error);
        res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({ error: "Server error" });
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