const cron = require("node-cron");
const mongoose = require("mongoose");
const Coupon = require("../models/couponSchema");  // Adjust path if needed

// Run every day at midnight (00:00)
cron.schedule("0 0 * * *", async () => {
    try {
        const result = await Coupon.updateMany(
            { expireOn: { $lt: new Date() }, isActive: true,isExpired:false },
            { $set: { isActive: false ,isExpired:true} }
        );
        console.log(`${result.modifiedCount} expired coupons deactivated.`);
    } catch (error) {
        console.error("Error updating expired coupons:", error);
    }
});

console.log("✅ Coupon Expiry Checker Running...");
