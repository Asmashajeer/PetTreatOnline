const express= require ('express');
const router= express.Router();
const {userAuth,adminAuth}=require('../../middleware/auth');
const adminController= require('../../controllers/admin/adminController');
const customerController=require('../../controllers/admin/customerController');
const categoryController= require('../../controllers/admin/categoryController');
const brandController= require('../../controllers/admin/brandController');
const productController= require('../../controllers/admin/productController');
const couponController = require('../../controllers/admin/couponController');
const orderController = require('../../controllers/admin/orderController');
const reportController = require('../../controllers/admin/reportController');
const referralController= require('../../controllers/admin/referralController');
const transactionController=require('../../controllers/admin/transactionController');

//----multer----------
const multer =require('multer');
const storage = require('../../helpers/multer');
const uploads=multer({storage:storage});


//----------------admin login-------------
router.get('/pageError',adminController.pageError);
router.get('/login',adminController.loadLogin);
router.post('/login',adminController.login);
router.get('/',adminAuth,adminController.loadDashboard);
router.get('/dashboard',adminAuth,adminController.loadDashboard);
router.get('/logout',adminController.logOut);


//-----------------admin dashBoard------------------

router.get('/dashboard/Chart',adminAuth,adminController.getChartData);
router.get('/dashboard/Chart/:type',adminAuth,adminController.getChartData1);

//--------user Management-------------
router.get('/users',adminAuth,customerController.customerInfo);
router.get('/blockCustomer',adminAuth,customerController.customerBlocked);
router.get('/unblockCustomer',adminAuth,customerController.customerUnblocked);

//---------------category management------------
router.get('/category',adminAuth,categoryController.categoryInfo);
router.post('/addCategory',adminAuth,categoryController.addCategory);
router.get('/listCategory',adminAuth,categoryController.listCategory);
router.get('/unlistCategory',adminAuth,categoryController.unlistCategory);
router.get('/editCategory',adminAuth,categoryController.getEditCategory);
router.post('/editCategory/:id',adminAuth,categoryController.updateCategory);
router.post('/addCategoryOffer',adminAuth,categoryController.addCategoryOffer);
router.post('/removeCategoryOffer',adminAuth,categoryController.removeCategoryOffer);


//----------Brand Management------------
router.get('/brands',adminAuth,brandController.getBrand);
router.post('/addbrand',adminAuth,uploads.single('file'),brandController.addBrand);
router.get('/blockBrand',adminAuth,brandController.blockBrand);
router.get('/unblockBrand',adminAuth,brandController.unblockBrand);
router.get('/deleteBrand',adminAuth,brandController.deleteBrand);

//------------------product management------------
router.get('/addProduct',adminAuth,productController.getAddProduct);
router.post('/addProduct',adminAuth,uploads.array('productImages', 3),productController.addProduct);
router.get('/products',adminAuth,productController.getAllProducts);
// router.patch('/blockProduct/:id',adminAuth,productController.blockProduct);
router.get('/blockProduct',adminAuth,productController.blockProduct);
router.get('/unblockProduct',adminAuth,productController.unBlockProduct);
router.get('/editProduct',adminAuth,productController.getEditProduct);
router.put('/updateProduct',adminAuth,uploads.array('productImages', 3),productController.updateProduct);
router.post('/addProductOffer',adminAuth,productController.addProductOffer);
router.post('/removeProductOffer',adminAuth,productController.removeProductOffer);



//----------------coupon Management------------------
router.get('/coupons',adminAuth,couponController.loadCoupon);
router.post('/createCoupon',adminAuth,couponController.createCoupon);
router.get('/editCoupon/:id',adminAuth,couponController.editCoupon);
router.post('/updateCoupon/:id',adminAuth,couponController.updateCoupon);

router.get('/deleteCoupon/:id',adminAuth,couponController.deleteCoupon)

//------------------referral Offer----------------

router.get('/referralOffer',adminAuth,referralController.referralOfferPage);
router.post('/addReferalOffer',adminAuth,referralController.addReferralOffer);
router.get('/removeReferralOffer/:id',adminAuth,referralController.removeReferralOffer);

//---------------order management----------------
router.get('/orders',adminAuth,orderController.loadOrders);
router.get('/orders/EditOrderStatus/:id',adminAuth,orderController.viewOrder);
router.post('/orders/changeOrderStatus/:id',adminAuth,orderController.changeOrderStatus);
router.get('/order/manageReturn/:orderId/:productId',adminAuth,orderController.manageReturnForm);
router.post('/order/updateReturn',adminAuth,orderController.updateReturn);
//------------------Reports-----------------------------
router.get('/salesReport',adminAuth,reportController.salesReportPage);
router.get('/generateReport',adminAuth,reportController.generateReport);
router.get('/exportAsPDF',adminAuth,reportController.generatePDFReport);

//----------------transactions-------------------------
router.get('/transactions',adminAuth,transactionController.Alltransactions);




module.exports=router;