const  Product =require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');

//------------------ load Shopping page--------
const loadShopping= async(req,res)=>{
    try {
        const user=req.session.user;
        const cartSize=req.session.cartSize;
       
        if(user){
                const userData= await User.findOne({_id:user})
        }        
        const {categoryId}= req.query;
      
    
        const categories= await Category.find({isListed:true});
        const query={
            isBlocked:false,
            stock:{$gt:0}
        };            
       if(categoryId){
            query.category=categoryId;
        }  
        const productData=await Product.find(query).populate('category');
       
         //-----for ajax call-------------------   
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    // If AJAX request, send products as JSON          
                    return res.json(productData);
                }
                 
                if(user){
                    const userData= await User.findOne({_id:user})
                   return  res.render('shop',{user:userData,products:productData,category: categories,cartSize,wList:req.session.wList});            
                }else{
                  
                    return res.render('shop',{products:productData,category: categories});
                }  
        
            
    }catch(error){
        console.log('shopping page not found srver Error',error);
        res.status(500).redirect("/pageNotFound");
    }
}

const productDetails=async (req,res)=>{
    try {
            const userId= req.session.user;
            const userData= await User.findById(userId);
            const productId=req.query.id;
            const productData=await Product.findById({_id:productId}).populate('category');

            const category = await Category.find({isListed:true});
            if(userData){
                 res.render('productDetails',{user:userData,product:productData,category:category,cartSize:req.session.cartSize,wList:req.session.wList});
            }else
                res.render('productDetails',{product:productData,category:category});
    } catch (error) {
        console.error('Error for fetching product details');
        return res.status(500).redirect('/pageNotFound');
    }
}
//---------------products with filter----------
const filterShopping =async (req,res)=>{
    try {
        const user=req.session.user;
       
        if(user){
                const userData= await User.findOne({_id:user})
        }        
        const {categoryId}= req.query ;
        const {filter}=req.query;
        console.log(filter);
        const categories= await Category.find({isListed:true});
        const query={
            isBlocked:false,
            stock:{$gt:0}
        };            
       if(categoryId){
            query.category=categoryId;
        }    
        if(filter==='price-low-high' ||filter==='price-high-low'){
            const rule = filter==='price-low-high'? 1:-1;
            const products=await Product.find(query).sort({regularPrice:rule});
            return res.status(200).json(products);
        }
        else if(filter==='A-Z' ||filter==='Z-A'){
            const rule= filter==='A-Z'? 1:-1;
            const products=await Product.find(query).sort({productName:rule});
            return res.status(200).json(products);
        }
        else if(filter==='new-arrivals'){
            const products=await Product.find(query).sort({createdAt:-1});
            return res.status(200).json(products);
        }
        else{ 
            const products=await Product.find(query);
            return res.status(200).json(products);           
        }
            
    } catch (error) {
        console.log("Error fetching products: ",error);
        res.redirect('/pageNotFound');
    }
}
//---------------------------product Search------------------
const productSearch= async (req,res)=>{
    try {
        const search=req.query.search||"";                    
           const products= await Product.find({
                $or:[
                    {productName:{$regex:'.*'+search+'.*',$options: 'i' }},
                    {brand:{$regex:'.*'+search+'.*',$options: 'i' }}                    
                ],
            }).sort({productName:1});
           
            return res.status(200).json(products); 

    } catch (error) {
        console.log("Error while fetching products...",error);
        res.status(500).redirect('/pageNotFound');
    }
}
const categorisedProducts= async(req,res)=>{
    try {
        const user=req.session.user;
       
        if(user){
                const userData= await User.findOne({_id:user})
        }
        const categories= await Category.find({isListed:true});
        let query={};
        let currentCategory=req.query.id;
        if(req.query.id){        
            const categoryId= req.query.id;  
            currentCategory=await Category.findById(categoryId);
            query={
                isBlocked:false,
                stock:{$gt:0},      
                category:categoryId
                }                
        }else if(req.query.name){
            const categoryName= req.query.name;   
            currentCategory=await Category.findOne({name:categoryName});
            query={
                isBlocked:false,
                stock:{$gt:0},      
                category:currentCategory._id
                }               
        }
        const productData=await Product.find(query);          
        if(user){
            const userData= await User.findOne({_id:user})
            return  res.render('categorised',{user:userData,products:productData, category:categories,currentCategory:currentCategory,cartSize:req.session.cartSize,wList:req.session.wList});            
        }else{                  
            return res.render('categorised',{products:productData,category:categories,currentCategory:currentCategory});
        }  
        
            
    }catch(error){
        console.log('shopping page not found srver Error',error);
        res.status(500).redirect("/pageNotFound");
    }
}

                      


module.exports={
    loadShopping,
    productDetails,
   filterShopping,
   productSearch,
   categorisedProducts
   
}