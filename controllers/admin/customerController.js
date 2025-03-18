const User =require('../../models/userSchema');


//-------------list customers----------
const customerInfo=async (req,res)=>{
    try {
         let search="";    
         if(req.query.search){
            search=req.query.search;       
         }
         let page=1;
         if(req.query.page){
            page=req.query.page;            
         }
         let limit=3;
        
         const userData=await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:'.*'+search+'.*'}},
                {email:{$regex:'.*'+search+'.*'}}
            ]
         })
         .limit(limit*1)
         .skip((page-1)*limit)
         .exec();
       
         const count=await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:'.*'+search+'.*'}},
                {email:{$regex:'.*'+search+'.*'}}
            ],
         }).countDocuments();

         res.render('customers',{data:userData,totalPages:Math.ceil(count/limit),currentPage:page});
    } catch (error) {
        console.log("error while listing customers");
        res.redirect('/pageError');
    }
}


//------------Block a Customer---------
const customerBlocked=async(req,res)=>{
    try {
        let id=req.query.id;
        const updateUser= await User.updateOne({_id:id},{$set:{isBlocked:true}});
        if(!updateUser){
            console.log("error blocking user");
            res.status(400).json({message:'error bloking user'}).redirect('/admin/users');
        }
        const sessionStore = req.sessionStore;

        sessionStore.all((err, sessions) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error retrieving sessions');
            }

            const userSessionId = Object.keys(sessions).find(sessionId => {
                const session = sessions[sessionId];
                return session.user && session.user === id; 
            });

            if (userSessionId) {
                sessionStore.destroy(userSessionId, destroyErr => {
                    if (destroyErr) {
                    console.error("Error destroying session:", destroyErr);
                    return res.status(500).json({ message: "Failed to destroy session." });
                    }
                    console.log("user session destroyed");
                    // return res.redirect('/logout');
                }) ;

            }else{
                console.log("there is no active session of user");
                 res.redirect('/admin/users');
            }
           
        });

       
    } catch (error) {
        console.log(`error while blocking`);
        res.render('pageError');
    }
}

//------------Unblock a Customer---------
const customerUnblocked=async(req,res)=>{
    try {
        let id=req.query.id;
        const updateUser= await User.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect('/admin/users');
    } catch (error) {
        console.log(`error while blocking`);
        res.render('/pageError');
    }
}


module.exports={
    customerInfo,
    customerBlocked,
    customerUnblocked
}