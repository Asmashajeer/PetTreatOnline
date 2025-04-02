const Brand = require('../../models/brandSchema');
const Product= require('../../models/productSchema');
const {STATUS_CODE,MESSAGE}=require('../../helpers/utils');

//---------------------All Brands--------------
const  getBrand= async(req,res)=>{
    try {

         const page= req.query.page || 1;
         const limit= 4;       
         const skip=(page-1)*limit;
         const brandData= await Brand.find({}).sort({createdAt:1}).skip(skip).limit(limit);
         
            const totalBrands= await Brand.countDocuments();
            const totalPages= Math.ceil(totalBrands/limit);
            const reverseBrand=brandData.reverse();
            res.render('brands',{
                data:reverseBrand,
                currentPage:page,
                totalPages:totalPages,
                totalBrands:totalBrands});
        
    } catch (error) {
        console.error(MESSAGE.SERVER_ERROR,error);
    }
}

//----------------add new Brand-------------
const addBrand =async(req,res)=>{
    try {
            const brand=req.body.name.trim().toLowerCase();
            const findBrand=await Brand.findOne({ brandName: { $regex: '^' + brand + '$', $options: 'i' }});

            if(findBrand){
                console.log("This brand Already exist");
                return res.status(STATUS_CODE.BAD_REQUEST).json({error:"Brand already exist"});                                   

            }else{
                const image=req.file.filename;               
                const newBrand= new Brand({
                    brandName:brand,
                    brandImage:image
                });               
                await newBrand.save();
                return res.status(STATUS_CODE.SUCCESS).json ({message:"new Brand Added successfully  "});          
            }
        } catch (error) {
            console.error(MESSAGE.SERVER_ERROR,error);
            return res.status(500).json({error:'Internal server error'});
        }
}

//---------------- block a brand----------
const blockBrand= async(req,res)=>{
    try {
        const id= req.query.id;
        
        const result=await Brand.updateOne({_id:id},{$set:{isBlocked:true}}); 
        const brand= await Brand.findOne({_id:id,isBlocked:true});
        const products=await Product.updateMany({brand:brand.brandName},{$set:{isBlocked:true}});
        console.log(result);
        if(result)
            res.redirect('/admin/brands');
        else
            console.log("errorWHILE BLOCKING");
    } catch (error) {
        console.error(MESSAGE.SERVER_ERROR,error);
        res.render('/pageError');
    }
}

//---------------- unblock a brand----------
const unblockBrand= async(req,res)=>{
    try {
        const id= req.query.id;
        await Brand.updateOne({_id:id},{$set:{isBlocked:false}});
        const brand= await Brand.findOne({_id:id,isBlocked:false});
        const products=await Product.updateMany({brand:brand.brandName},{$set:{isBlocked:false}});
        res.redirect('/admin/brands');
        
    } catch (error) {
        console.error(MESSAGE.SERVER_ERROR,error);
        res.render('/pageError');
    }
}


//----------------delete a brand----------
const deleteBrand= async(req,res)=>{
    try {
        const id= req.query.id;
        if(!id){
            res.status(STATUS_CODE.BAD_REQUEST).redirect('/pagerError');
        }
        await Brand.deleteOne({_id:id});
        res.redirect('/admin/brands');
        
    } catch (error) {
        console.error(MESSAGE.SERVER_ERROR,error);
        res.render('/pageError');
        
    }
}
module.exports={
    getBrand,
    addBrand,
    blockBrand,
    unblockBrand,
    deleteBrand
}