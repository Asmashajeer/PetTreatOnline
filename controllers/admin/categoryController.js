const { STATUS_CODE,MESSAGE } = require('../../helpers/utils');
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');


//---------------category information-------
const categoryInfo= async (req,res)=>{
    try {
        const search=req.query.search||"";
        const page=req.query.page||1;
        const limit=4;
        const skip=(page-1)*limit;

        const categoryData=await Category.find({            
                $or:[
                    {name:{$regex:'.*'+search+'.*', $options: 'i'}}                                      
                ]             
        })
        .sort({createsAt:1})
        .skip(skip)
        .limit(limit);


        const totalCategories=await Category.find({            
            $or:[
                {name:{$regex:'.*'+search+'.*', $options: 'i'}}                                      
            ]             
        }).countDocuments();
        const totalPages= Math.ceil(totalCategories/limit);
        res.render('category',{data:categoryData,currentPage:page,totalPages:totalPages,totalCategories:totalCategories});

    } catch (error) {
        console.log("Error while fetching categories ");
        res.redirect('/pageError');
    }
}


//-----------------add a new catogory-------------------
const addCategory=async(req,res)=>{
    try {   

        const {name,description}= req.body;
        let cname = name.toUpperCase();  
        console.log(cname);
        let findCategory= await Category.findOne({name:cname});
        if(findCategory){
            return res.status(STATUS_CODE.BAD_REQUEST).json({error:'Category already exist'});            
        }
        let newCategory= new Category({
            name:cname,
            description
        });
        await newCategory.save();
        res.status(STATUS_CODE.SUCCESS).json ({message:"Category Added successfully  "});

        
    } catch (error) {
        res.status(500).json({error:'Internal server error'});
        
    }
}


//-------------------list a catogory=-----------------
const listCategory= async (req,res)=>{
   
        try {
            const id=req.query.id;
           
            const updateResult=await Category.updateOne({_id:id},{$set:{isListed:true}});
            const updateProducts=await Product.updateMany({category:id},{$set:{isBlocked:false}});
            if (updateResult)
                { console.log("Success: Category updated"); 
    
                 } else { 
                        console.log("Error: Category not found"); 
                }
           res.redirect('/admin/category');
        } catch (error) {
           console.log(`error while listing`);
           res.redirect('/pageError');
        }
}


//-------------------Unlist a catogory-----------------
const unlistCategory= async(req,res)=>{
    try {
        const id=req.query.id;
        
        const updateResult=await Category.updateOne({_id:id},{$set:{isListed:false}});
        const updateProducts=await Product.updateMany({category:id},{$set:{isBlocked:true}});
        if (updateResult)
            { console.log("Success: Category updated"); 

             } else { 
                    console.log("Error: Category not found"); 
            }
       res.redirect('/admin/category');
    } catch (error) {
       console.log(`error while unlisting`);
       res.redirect('/pageError');
    }
}




//---------------edit category-----------------

const getEditCategory = async(req,res)=>{
    try {
        const id = req.query.id;
        
        const category = await Category.findOne({_id:id});
        if(category){
                
            res.render('editCategory',{category:category});
        }else{
             console.log(`Error while fetching`);
        }
    } catch (error) {
        console.log(`error while fetching`);
        res.redirect('/pageError');
    }
}


const updateCategory= async(req,res)=>{
    try {
        const id= req.params.id;
        const{name,description}=req.body;
        let cname=name.trim().toUpperCase();
        const existingCategory= await Category.findOne({name:cname});
        if(existingCategory){
           return  res.status(STATUS_CODE.BAD_REQUEST).render('editCategory',{category:existingCategory,message:"category exist please enter another name"});
        }
       const updated= await Category.findByIdAndUpdate(id,{name:cname,description:description},{new:true});
        if(updated)
            res.redirect('/admin/category');
        else
            res.status(STATUS_CODE.BAD_REQUEST).json({error:"category not found"});



    } catch (error) {
        res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({error:MESSAGE.SERVER_ERROR});
    }
    
}


//------------------------add  category Offer-----------------
const addCategoryOffer=async(req,res)=>{
    try {
        const percentage=parseInt(req.body.percentage);
        const categoryId =req.body.categoryId;
        const category= await Category.findById(categoryId);
        if(!category){
            return res.status(STATUS_CODE.BAD_REQUEST).json({tatus:false,message:"category not found"});
        }
        const products=await Product.find({category:categoryId});
        const hasProductOffer =products.some(product=>product.productOffer>percentage);
        if(hasProductOffer){
            return res.json({status:false,message:"Products in the category already have product offer"});
        }
        await Category.updateOne({_id:categoryId},{$set:{categoryOffer:percentage}});
        for(let product of products){
            product.productOffer=0;
            product.salePrice-=Math.floor(product.regularPrice*(percentage/100));
            await product.save();
        }
        res.json({status:true});
    } catch (error) {
        return res.status(500).json({status:false,message:"internal servor error"});
}
}

//----------------------------- REMOVE CATEGORY oFFER------------
const removeCategoryOffer = async(req,res)=>{
    try {
        
        const categoryId =req.body.categoryId;
        const category= await Category.findById(categoryId);
        if(!category){
            return res.status( STATUS_CODE.BAD_REQUEST).json({status:false,message:"category not found"});
        }
        const percentage= category.categoryOffer;
       
        const products=await Product.find({category:category._id});
      
        if(products.length>0){
            
            for(let product of products){
                product.salePrice+=Math.floor(product.regularPrice*(percentage/100));
                product.productOffer=0;
                await product.save();
              
            }
            category.categoryOffer=0;
            await category.save();
            return res.status(STATUS_CODE.SUCCESS).json({status:true,message:"category offer added"});
        }else{
            category.categoryOffer=0;
            await category.save();
            return res.status(STATUS_CODE.SUCCESS).json({status:true,message:"No products in this category"});
        }
    }catch(error){
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({status:false,message:MESSAGE.SERVER_ERROR});
    }
}
module.exports={
    categoryInfo,
    addCategory,
    listCategory,
    unlistCategory,
    getEditCategory,
    updateCategory,
    addCategoryOffer,
    removeCategoryOffer  
}