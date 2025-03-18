const express= require ('express');
const router= express.Router();
const passport= require('passport');
const userController= require('../../controllers/user/userController');
const {userAuth}= require('../../middleware/auth');
const productController=require('../../controllers/user/productController');
const brandController= require('../../controllers/user/brandController');
const profileController= require('../../controllers/user/profileController');
const cartController=require('../../controllers/user/cartController');
const checkoutController=require('../../controllers/user/checkoutControllers');
const orderController= require('../../controllers/user/orderController');
const wishlistController= require('../../controllers/user/wishlistController');
const walletConttroller= require('../../controllers/user/walletController');
const aboutController= require('../../controllers/user/aboutController');
//-----------------home Route-------------------
router.get('/',userController.loadHomePage);     //home page
router.get('/pageNotFound',userController.pageNotFound);    //page notFound

//------------user registration----------------------
router.get('/register',userController.loadSignUp);
router.post('/register',userController.createUser);
router.post('/verify_otp',userController.verifyOtp);
router.post('/resend_Otp',userController.resendOtp);

//----------------google registation-------
router.get('/auth/google',passport.authenticate('google',{scope:['Profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/register'}),(req,res)=>{
    
    res.redirect('/')
});

//----user signIn--
router.get('/signIn',userController.loadSignIn);
router.post('/signIn',userController.signIn);
router.get('/logout',userController.logout);



//----------product Management---
router.get('/productDetails',productController.productDetails);
router.get('/shop',productController.loadShopping);
router.get('/shop/filter',productController.filterShopping);
router.get('/shop/search',productController.productSearch);
router.get('/search',productController.productSearch);
router.get('/categorised',productController.categorisedProducts);
router.get('/brand',brandController.getBrand);



//-------------profile management-----------
router.get('/forgotPassword',profileController.forgotPassword);
router.post('/verifyEmailResetPassword',profileController.verifyEmailResetPassword);
router.post('/verify_OtpResetPassword',profileController.verify_OtpResetPassword);
router.get('/resetPassword',profileController.resetPasswordPage);
router.post('/resetPassword',profileController.resetPassword);

router.get('/profile',userAuth,profileController.userProfile);
router.get('/changeEmail',userAuth,profileController.changeEmail);
router.post('/verifyPassword',userAuth,profileController.verifyPassword);
router.get('/verifyEmail',userAuth,profileController.verifyEmail);
router.get('/updateEmail',userAuth,profileController.updateEmailpage);
router.post('/updateEmail',userAuth,profileController.updateEmail);
router.post('/verifyEmailOtp',userAuth,profileController.verifyEmailOtp);
router.post('/resend_EmailOtp',userAuth,profileController.resendOtp);
router.get('/changePassword',userAuth,profileController.changePasswordPage);
router.post('/changePassword',userAuth,profileController.updatePassword);


router.get('/referalCode/:refCode',userAuth,profileController.generateReferalCode);



//-----------------addressManagement-------------------
router.get('/addAddress',userAuth,profileController.addAddressForm);
router.post('/addAddress',userAuth,profileController.SaveAddress);
router.get('/editAddress',userAuth,profileController.editAddressPage);
router.post('/editAddress',userAuth,profileController.editAddress);
router.get('/deleteAddress',userAuth,profileController.deleteAddress);


//---------------------------cart management-----------------------

router.get('/shopingCart',userAuth,cartController.showCart);
router.post('/addToCart',userAuth,cartController.addToCart);
router.put('/shoppingCart/removeOne/:id',userAuth,cartController.removeOne);
router.put('/shoppingCart/addOne/:id',userAuth,cartController.addOne);
router.get('/shoppingCart/deleteItem/:id',userAuth,cartController.deleteFromCart);

//---------checkout--------------------
router.post('/checkout',userAuth,checkoutController.loadCheckoutPage);
router.post('/applycoupon',userAuth,checkoutController.applyCoupon);

router.get('/addAddressCheckOut',userAuth,checkoutController.addAddressCheckOutForm);
router.post('/addAddressCheckOut',userAuth,checkoutController.SaveCheckoutAddress);


// -------------orderManagement------------

router.post('/createOrder',userAuth,orderController.createOrder);
router.post('/orders/payment/verify',userAuth,orderController.verifyPayment);
router.get('/orderSuccess',userAuth,orderController.orderSuccess);
router.get('/orderFailed/:id',userAuth,orderController.orderFailed);
router.get('/retryPayment/:id',userAuth,orderController.retryPayment);
router.post('/orders/retrypayment/verify',userAuth,orderController.verifyRetryPayment);
router.get('/orders/detailedOrderView/:id',userAuth,orderController.detailedOrderView);
router.put('/order/cancelAnItem',userAuth,orderController.cancelAnItem);
router.get('/orders/cancelOrder/:id',userAuth,orderController.cancelOrder);
router.get('/orders/trackorder/:id',userAuth,orderController.trackOrder);
router.get('/orders/returnAnItemRequest/:orderId/:productId/:productName/:quantity/:price',userAuth,orderController.returnOrderRequestPage);
router.post('/orders/returnRequest',userAuth,orderController.returnOrderRequest);

router.get('/order/invoice/:id',userAuth,orderController.invoice);
router.get("/orders/downloadInvoice/:orderId",userAuth,orderController. generatePDFInvoice);

//--------------wishList-------------------------

router.get('/addwishlist/:id',userAuth,wishlistController.addWishlist);
router.get('/removeFromWishlist/:id',userAuth,wishlistController.removeFromwishlist);


router.put('/wallet/topUp',userAuth,walletConttroller.topUp);
router.post('/wallet/payment/verify',userAuth,walletConttroller.verifyPayment);


//------------aboutus and contact----------

router.get('/about',aboutController.aboutUs);
router.get('/contactUs',aboutController.contactUs);






module.exports=router;

