const Coupon = require('../../models/couponSchema');
const Order =require('../../models/orderSchema');
const Product= require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const User=require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const Category= require('../../models/categorySchema');
const puppeteer = require("puppeteer");



const salesReportPage=async(req,res)=>{
    const category= await Category.find({isListed:true});

    res.render('salesReports',{category});
}



//-------------------------generating  Sales report--------------------------------
const generateReport= async (req, res) => {
    try {
        let  { startDate, endDate, reportType } = req.query;
        console.log(startDate,"\n",endDate,"\n",reportType,);
        if(startDate===endDate){
           endDate= new Date(new Date(startDate).setDate(new Date(startDate).getDate() + 1)) // Next day start (excludes next day data)
        }
        let salesReport;
        if(reportType===''){
            // const dailyReport=await Order.find({createdOn:{ $gte: new Date(startDate), $lt:new Date(endDate) },
            //         paymentStatus:'Paid'},{createdOn:1,orderPrice:1});
            const todayReport=await Order.aggregate([
                {
                    $match: {
                        createdOn:{ $gte: new Date(startDate), $lt:new Date(endDate) },
                        paymentStatus:'Paid'
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d (%H:%M:%S)",date: "$createdOn" } },
                        noOfOrders: { $sum: 1 },
                        totalSale: { $sum: "$orderPrice" },
                        avgSalesValue:{$avg:"$orderPrice"},
                        totalDiscount:{$sum:"$discount"},                    
                    }
                }
            ]);
            todayReport.forEach(entry => {
                entry.period = entry._id;
            });
                salesReport=todayReport;
        }
       if(reportType==='daily'){   //------------------------Daily Report------------
        
            const dailyReport=await Order.aggregate([
                {
                    $match: {
                        createdOn:{ $gte: new Date(startDate), $lt:new Date(endDate) },
                        paymentStatus:'Paid'
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdOn" } },
                        noOfOrders: { $sum: 1 },
                        totalSale: { $sum: "$orderPrice" },
                        avgSalesValue:{$avg:"$orderPrice"},
                        totalDiscount:{$sum:"$discount"},                    
                    }
                }

            ]);  
            //--------set the period of report----
            dailyReport.forEach(entry => {
                entry.period = entry._id;
            });
            salesReport=dailyReport;
       
       }else  if(reportType==='weekly'){            //---weeklyReport---------------
            const weeklyReport = await Order.aggregate([
                {
                    $match: {
                        createdOn: { $gte: new Date(startDate),$lt: new Date(endDate) },
                        paymentStatus: 'Paid'
                    }
                },
                {
                    $group: {
                        _id: { 
                            year: { $year: "$createdOn" }, // Extract year
                            week: { $isoWeek: "$createdOn" } // Extract ISO week number
                        },
                        noOfOrders: { $sum: 1 },
                        totalSale: { $sum: "$orderPrice" }, 
                        avgSalesValue: { $avg: "$orderPrice" }, 
                        totalDiscount: { $sum: "$discount" } 
                    }
                },
                {
                    $sort: { "_id.year": 1, "_id.week": 1 } 
                }
            ]);
         
            // Convert week number to a readable date range
            weeklyReport.forEach(entry => {
                const year = entry._id.year;
                const week = entry._id.week;

                // Get the start and end date of the week
                const firstDayOfWeek = new Date(year, 0, (week - 1) * 7 + 1);
                const lastDayOfWeek = new Date(firstDayOfWeek);
                lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);

                // Format as YYYY-MM-DD
                const startOfWeek = firstDayOfWeek.toISOString().split("T")[0];
                const endOfWeek = lastDayOfWeek.toISOString().split("T")[0];

                entry.period = `${startOfWeek} to ${endOfWeek}`;
            });
          
            salesReport=weeklyReport;
          
       }else if(reportType==='monthly'){  //-----------------monthly Report-------------------
            const monthlyReport = await Order.aggregate([
                {
                    $match: {
                        createdOn: { 
                            $gte: new Date(startDate),  
                            $lt: new Date(endDate)      
                        },
                        paymentStatus: 'Paid'
                    }
                },
                {
                    $group: {
                        _id: { 
                            year: { $year: "$createdOn" },   // Extract year
                            month: { $month: "$createdOn" } // Extract month (1-12)
                        },
                        noOfOrders: { $sum: 1 },
                        totalSale: { $sum: "$orderPrice" },
                        avgSalesValue: { $avg: "$orderPrice" },
                        totalDiscount: { $sum: "$discount" }
                    }
                },
                {
                    $sort: { "_id.year": 1, "_id.month": 1 } 
                }
            ]);
            monthlyReport.forEach(entry => {
                const date = new Date(entry._id.year, entry._id.month - 1); // Month is 0-based in JS
                const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date);
                entry.period=`${monthName} ${entry._id.year}`;
            });
            salesReport=monthlyReport;           
       }
       const overallSalesCount =salesReport.reduce((total,entry)=>total+=entry.noOfOrders,0);
       const overallOrderAmount =salesReport.reduce((total,entry)=>total+=entry.totalSale,0);
       const overallavgSalesValue =salesReport.reduce((total,entry)=>total+=entry.avgSalesValue,0);
       const  overallDiscount = salesReport.reduce((total,entry)=>total+=entry.totalDiscount,0);
       return res.status(200).json({ success: true, salesReport:salesReport,overallSalesCount,overallOrderAmount,overallavgSalesValue,overallDiscount});

    } catch (error) {
        console.log("server error:",error);
        res.status(500).json({ success: false, message: "Server error" });
    }
}


//--------------- export as PDF----------------------
// Route to generate the PDF from the EJS page
const generatePDFReport = async (req, res) => {
    try {
        const browser = await puppeteer.launch({ headless: "new" }); // Use 'new' to avoid deprecation warnings
        const page = await browser.newPage();

        // Load the EJS report page (Ensure the URL is correct)
        const reportURL = `http://http://localhost:5000/order/invoice/order_Q35bbztxPGww9U`; // Update with your actual server URL
        await page.goto(reportURL, { waitUntil: "networkidle0" });

        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true, // Ensures CSS is applied
        });

        await browser.close();

        // Send the PDF file as a response
        res.setHeader("Content-Disposition", "attachment; filename=sales_report.pdf");
        res.setHeader("Content-Type", "application/pdf");
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Error generating PDF");
    }
};




module.exports={
    salesReportPage,
    generateReport,
    generatePDFReport
}