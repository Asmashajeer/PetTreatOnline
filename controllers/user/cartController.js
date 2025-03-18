const Cart =require('../../models/cartSchema');
const User= require('../../models/userSchema');
const Product =require('../../models/productSchema');

//--------------------show Cart-----------------
const showCart=async(req,res)=>{
   try {
        const userId=req.session.user;
        const user=await User.findById({_id:userId});
        if(!user){
            console.log("user not signed in")
            return res.rdirect('/signIn');
        }
        const myCart= await Cart.findOne({userId:userId}).populate('items.productId');
        if(!myCart||myCart.items.length===0){            
            console.log("cart is empty");
            return res.render('shopingCart',{cartSize:req.session.cartSize});
        }
        for(let item of myCart.items){    //remove item which is outof stock from cart
            const currentProduct=await Product.findOne({_id:item.productId._id});
           
            if(currentProduct.stock<item.quantity && currentProduct.stock!==0){
                console.log(`${currentProduct.productName} is not  avalable as customer request`);
                const itemToReduce=currentProduct._id;                
                reducedQuantity=item.quantity-currentProduct.stock;
                item.quantity=currentProduct.stock;
                reducedPrice= item.productId.salePrice*reducedQuantity;
                console.log(reducedQuantity,reducedPrice, item.quantity)
                await Cart.updateOne({userId:userId,items:{$elemMatch:{productId:itemToReduce}}},
                    {$inc:{'item.$.quantity':-reducedQuantity,totalQty:-reducedQuantity,totalPrice:-(reducedPrice)}},{new:true});
                
            }else if(currentProduct.stock===0){``
                console.log(`${currentProduct.productName} is out of stock`);
                reducedQuantity=item.quantity;
                reducedPrice= item.productId.price*reducedQuantity

                myCart = await Cart.updateOne({userId:userId},
                    {   $pull:{items:{productId: currentProduct._id}},
                        $inc:{totalQty:-reducedQuantity,totalPrice:-reducedPrice}
                    },{new:true});
               
            }      
        }      
        req.session.cartSize=myCart.items.length;
        res.render('shopingCart',{cart:myCart,user:user,cartSize:req.session.cartSize,wList:req.session.wList});
   } catch (error) {
        console.error("unable fetch from Cart",error);
        res.status(500).redirect('/pageNotFound');
   }
   
}



//-----------------------add to cart---------------
const addToCart =async(req,res)=>{
    try {
        const userId= req.session.user;
        const pId = req.body.productId;
        cartSize=0;
        const quantity = parseInt(req.body.quantity);
        console.log('pId :',pId,'quantity  :  ',quantity);
       if(!userId){
            console.log('user Not signed In')
        return res.status(404).json({message:"please sign in to add product to cart"});
       }        
       
        if (!pId || isNaN(quantity) || quantity<1) {
            console.log("Missing product details");
            return res.status(400).json({ message: "Missing product details" });
        }
        const findUser= await User.findById({_id:userId});
        if(!findUser){
            console.log('userNotFound')
            return res.status(404).json({message:"user not found",redirect:'/signIn'});
        }
        const product=await Product.findOne({_id:pId,isBlocked:false,stock:{$gt:0}});
        if(!product){
            console.log('product rNotFound')
            return res.status(404).json({message:"product not found"});
        }else if(product.stock<quantity){
            console.log('product Out Of Stock')
            return res.status(404).json({message:"product Out Of Stock"});
        }
        const productId=product._id;
       
        let cart=await Cart.findOne({userId}).populate('items.productId');
       
        
        if(!cart){
                cart=new Cart({
                userId:findUser._id,
                items:[{ productId,quantity}],
                totalQty:quantity,
                totalPrice:product.salePrice*quantity
            });
             await cart.save();
            
        }else{ 
            let itemFound = false;

            for (let item of cart.items) {
                if (item.productId._id.equals(pId)) {  //if item is already in the cart
                    await Cart.updateOne(
                        { userId: userId, 'items.productId': productId },
                        { $inc: { 'items.$.quantity': quantity ,totalQty: quantity,totalPrice:product.salePrice*quantity} }
                    ).then(result => {
                        console.log('updated');
                        itemFound = true;
                    }).catch(error => {
                        console.log("error updating");
                        return res.json({success:false, message:"errorAdding to cart"});
                    });
                    break; // Exit the loop once the item is found and updated
                }
            }
                //item not in the cart
            if (!itemFound) {
                cart.items.push({ productId, quantity });
                cart.totalQty+=quantity;
                cart.totalPrice+=product.salePrice*quantity;
                await cart.save();
            }       
       
        }
        req.session.cart=cart;
        req.session.cartSize=cart.items.length;
        cartSize=req.session.cartSize;
        console.log("Addedto cart");
        return res.json({success:true,message:"Added to Cart",cart,cartSize});
        
    } catch (error) {
        console.error("unable to add to Cart",error);
        res.status(500).json({message:'internal server error'})
    }
}
//-------------------remove One item---------------


const removeOne=async(req,res)=>{
  try {
        const userId=req.session.user;
        const id=req.params.id;
        const {quantity}=req.body;
        console.log('---',id,quantity)
        if (!id || !quantity) {
            return res.json({ success: false, message: 'Missing parameters' });
        }
       
        const product= await Product.findById(id);
        
        let cart= await Cart.findOne({userId:userId,
            items:{$elemMatch:{productId:id}}
         });
        
         if(!cart){
             console.log('product rNotFound in cart')
            return res.status(404).json({message:"product not found in cart "});
         }
        
         result=await Cart.updateOne({userId:userId,items:{$elemMatch:{productId:id}}},
            {$inc:{'items.$.quantity':-quantity,totalQty:-quantity,totalPrice:-(product.salePrice*quantity)}},{new:true});
            if(result){
                console.log(`remove ${quantity} of${product.productName}removed from cart`);
               
                let cart= await Cart.findOne({userId:userId,
                    items:{$elemMatch:{productId:id}}
                 }); 
                req.session.cartSize=cart.items.length;
                 cartSize=req.session.cartSize;
                return res.status(200).json({success:true, message: "cart updated successfully",cart,cartSize });
            }else {
                console.log("error updating cart");
                return res.status(500).json({ success: false,message: "changes to cart failed", error });
            };
         
    } catch (error) {
        console.error("unable to change to Cart",error);
        res.status(500).json({message:'internal server error'})
    } 
}

//---------------------addOne item to quantityof cart

const addOne=async(req,res)=>{
    try {
          const userId=req.session.user;
          const id=req.params.id;
          const {quantity}=req.body;
        
          if (!id || !quantity) {
              return res.json({ success: false, message: 'Missing parameters' });
          }
          const cart= await Cart.findOne({userId:userId,
            items:{$elemMatch:{productId:id}}
         });
         if (cart) {
            const item = cart.items.find(item => item.productId.toString() === id.toString());
            
            const product = await Product.findById(id);
            console.log(item.quantity + quantity);
            if ((item.quantity + quantity) > product.stock) {              
                console.log("Product Out of Stock");
                let qty=item.quantity;
                return res.json({success:false, message: `${product.productName} Product Out of Stock`,qty:qty });
            } 
        
           result=await Cart.updateOne({userId:userId,items:{$elemMatch:{productId:id}}},
            {$inc:{'items.$.quantity':quantity,totalQty:quantity,totalPrice:(product.salePrice*quantity)}},{new:true});
            if(result){
                console.log(`add ${quantity} ${product.productName} to cart`);
               
                let cart= await Cart.findOne({userId:userId,
                    items:{$elemMatch:{productId:id}}
                 }); 
               
                return res.status(200).json({success:true, message: "cart updated successfully",cart });
            }else {
                console.log("error updating cart");
                return res.status(500).json({ success: false,message: "changes to cart failed", error });
            };
        } else {
            console.log("No cart found for this user with the specified product ID.");
            return res.json({success:false, message:"No cart found for this user with the specified product ID."});
        } 
           
      } catch (error) {
          console.error("unable to change to Cart",error);
          res.status(500).json({message:'internal server error'})
      } 
  }

//------------------delete item FromCart---------------

const deleteFromCart=async(req,res)=>{
  try {
        const userId=req.session.user;        
        const productIdToDelete= req.params.id;
    
        const product=await Product.findById(productIdToDelete);
        if(!product){
            console.log("product T Delete  not found in productList");
           return res.redirect('/shopingCart');
        }
                 
        const userCart= await Cart.findOne({userId:userId});
        if(!userCart){
            console.log(" user Cart not Found");
            return res.redirect('/shopingCart');
        }
        console.log('-------------------');
        const itemToDelete=userCart.items.find(item=>item.productId.toString()===productIdToDelete);
              deletedQuantity = itemToDelete.quantity;
              reducedPrice = deletedQuantity * product.salePrice;    
                   
              const deletedProduct = await Cart.updateOne({userId:userId},
                    {   $pull:{items:{productId:productIdToDelete}},
                        $inc:{totalQty:-deletedQuantity,totalPrice:-reducedPrice}
                    }
                    ); 
             
                if(deletedProduct.modifiedCount>0){
                    console.log("product deleted from cart");

                     return res.redirect('/shopingCart');
                }else{
                    console.log("product cannot  remove from cart");
                }       
            
    }catch (error) {
      console.error("server error while deleting",error);
      res.redirect('/pageNotFound');
    }  

  
}


module.exports={
    showCart,
    addToCart,
    removeOne,
    addOne,
    deleteFromCart
}