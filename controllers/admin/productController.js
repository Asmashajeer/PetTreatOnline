const Product =require("../../models/productSchema");
const Category=require('../../models/categorySchema');
const Brand =require('../../models/brandSchema');
const User= require('../../models/userSchema');
const fs =require('fs');
const path =require('path');
const sharp = require('sharp');



//--------------load Add A product page--------------
const getAddProduct= async(req,res)=>{
    try {

        const category = await Category.find({isListed:true});
        const brand= await Brand.find({isBlocked:false});
              res.render('addProduct',{category:category,brand:brand});
    } catch (error) {
        console.log("Error while loading Add product page");
        res.redirect('/admin/pageError');
    }

}


//-----------------add product-------------------
const addProduct=async(req,res)=>{
    const { productName, description, brand, category,regularPrice, salePrice, stock, weight } = req.body;
  try{ 
        console.log(productName, description, brand, category,regularPrice, salePrice, stock, weight );
        const existingProduct= await Product.findOne({productName:productName});        
        if(!existingProduct){
           
            const categoryId=await Category.findOne({name:category});
            if(!categoryId){
                return res.status(400).json({error:"Invalid Category name"});
            }
            if(req.files && req.files.length>0){  
                console.log(`files are receivd`);    
                const productImages=req.files.map(file => file.filename);
                console.log(productImages);
                const newProduct = new Product({
                      productName,
                      description,
                      brand,
                      category:categoryId._id,
                      regularPrice,
                      salePrice,
                      stock,
                      weight,
                      productImages: productImages,
                      status:'Available',
                });
                console.log(newProduct);
                const result= await newProduct.save();
                    if(result){
                        console.log('Product added successfully');
                        res.redirect('/admin/addProduct');
                    }else{
                        console.log('cannot save');
                        return redirect('/admin/addProduct');
                    }

            }else{
                console.log("no images received");
                res.status(500).json({message:"Server error"});
            }
        } 
  }catch(error)    {
    res.redirect('/pageError');
    console.error("Errrorwhile adding product");
  }
  
}




  //----------------products listing----------------
  const getAllProducts = async (req,res)=>{

            const search=req.query.search||"";
            const page= req.query.page ||1;                      
            const limit=4;
            const skip=(page-1)*limit;
            console.log(page,limit,skip);
     try {        
            const productData= await Product.find({
                $or:[
                    {productName:{$regex:'.*'+search+'.*', $options: 'i'}},
                    {brand:{$regex:'.*'+search+'.*', $options: 'i'}}                    
                ],
            }).sort({createdAt:-1}).skip(skip).limit(limit*1).populate('category').exec();
                      

            const count= await Product.find({
                $or:[
                    {productName:{$regex:'.*'+search+'.*', $options: 'i'}},
                    {brand:{$regex:'.*'+search+'.*', $options: 'i'}}                    
                ],
            }).countDocuments();    
        

            const totalPages=Math.ceil(count/limit);           
      
                 res.render('products',{data:productData,currentPage:page,totalProducts:count,totalPages:totalPages}); 
           

    } catch (error) {
        console.log("Error while fetching products...");
        res.redirect('/admin/pageError')
    }
  }
//------------------------------Block a product----------------
    
    const blockProduct = async(req,res)=>{
        try {
           const id=req.query.id;
             console.log('--------------------------');
            
           const updatedProduct=await Product.findByIdAndUpdate(id,{isBlocked:true},{new:true});
            if(updatedProduct){
                console.log("Product blocked");
                res.redirect('/admin/products');
            }else{
                console.log('error while blocking');
            }

        } catch (error) {
              console.log('error while blocking');
              res.redirect('/admin/pageError');
        }

    }


    //----------------Unblock theproduct--------------
    const unBlockProduct = async(req,res)=>{
        try {
           const id=req.query.id;
             console.log('--------------------------');
            
           const updatedProduct=await Product.findByIdAndUpdate(id,{isBlocked:false},{new:true});
            if(updatedProduct){
                console.log("Product unblocked");
                res.redirect('/admin/products');
            }else{
                console.log('error while unblocking');
            }

        } catch (error) {
              console.log('error while unblocking');
              res.redirect('/admin/pageError');
        }

    }

//-------------edit product-----------------
const getEditProduct= async (req,res)=>{

    try {
        const id=req.query.id;
      
        const productData=await Product.findOne({_id:id}).populate('category').exec();
        
        if(productData){
            
            const category = await Category.find({isListed:true});
            const brand= await Brand.find({isBlocked:false});
           return res.render('editProduct',{product:productData,category:category,brand:brand});
        }else
            console.log("--Product not found-")  ;
            return res.status(400).json({message:'product not found'})  ;
    } catch (error) {
        console.log("error while fetching product")  ;
            return res.status(500).render('pageError')  ;
    }
    
}
//----------------update product---------
const updateProduct=async (req,res)=>{
    try {
        const id =req.query.id;
        console.log( id);
        const { productName, description, brand, category,regularPrice, salePrice, stock, weight ,status} = req.body;
        const product = await Product.findById(id);
        console.log("checking for product");
        if (!product) {
        return res.status(404).json({ error: "Product not found" });
        }
        const categoryId=await Category.findOne({name:category});
            if(!categoryId){
                return res.status(400).json({error:"Invalid Category name"});
            }
        const updates={
                productName,
                 description,
                 brand,
                 category:categoryId._id,
                 regularPrice,
                 salePrice,
                 stock,
                 weight,                
                 status:status};

        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => file.filename);
            console.log(newImages);
            if(product.productImages.length<3){
                await Product.findByIdAndUpdate(id, {
                    $push: { productImages: { $each:newImages } } // ✅ Append new images
                }, { new: true });
            }else{
                product.productImages[0]=newImages[0];
                product.save();
            }   
            // updates.productImages = newImages; // Replace the old images
        }
              
        const updatedProduct = await Product.findByIdAndUpdate(id, updates, { new: true });
    if (updatedProduct) {
      return res.status(200).json({ message: "Product updated successfully", updatedProduct });
    } else {
      return res.status(404).json({ error: "Product not found" });
    }
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};




//-------------------delete a image---------------
const deleteImage= async(req,res)=>{
    try {
        const { productId, imageName } = req.body;
        console.log('----------------------------');
        console.log(productId, imageName);
        const product= await Product.findById({_id:productId})
        if(!product){
            return res.status(404).json({message:'product not found!!!'});
        }
        product.images=product.images.filter((img)=>img!==imageName);
        await product.save();
        res.status(200).json({ message: "Image deleted successfully" });
    } catch (error) {
        console.error(`erroedeldeting image `,error);
        res.status(500).json({ message: "Server error" });
    }
}

//------------------Add product Offfer----------------------

const  addProductOffer = async(req,res)=>{
    try{
        console.log("----------------------------------");
        const {percentage,productId}=req.body;
        const product= await Product.findOne({_id:productId});
        const category=await Category.findOne({_id:product.category});
        if(category.categortOffer>percentage){
            return res.json({status:false,message:"this product alreadyhas a categoryoffer"});
        }
        product.salePrice=product.salePrice-Math.floor(product.regularPrice*(percentage/100));
        product.productOffer=parseInt(percentage);
            await product.save();
            res.json({status:true,message:"OffferAdded"});
            //product.categoyOffer=0;
    }catch(error){
        console.log("errro while adding ProductOffer",error);
        res.redirect('/pageError');
    }
}    

//-----------------removeProduct Odrder----------------------
const  removeProductOffer = async(req,res)=>{
    try{
        const {productId}=req.body;
        const product= await Product.findOne({_id:productId});
        const percentage=parseInt(product.productOffer);
        product.salePrice=product.salePrice+Math.floor(product.regularPrice*(percentage/100));
        product.productOffer=0;
        await product.save();
        res.json({status:true});
            //product.categoyOffer=0;
    }catch(error){
        console.log("errro while adding ProductOffer",error);
        res.redirect('/pageError');
    }
}    

module.exports={
    getAddProduct,
    addProduct,
    getAllProducts,
    blockProduct,
    unBlockProduct,
    getEditProduct,
    deleteImage,
     updateProduct,
     addProductOffer,
   removeProductOffer
}