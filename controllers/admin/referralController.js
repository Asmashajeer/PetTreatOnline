const ReferralOffer = require('../../models/referralOfferSchema');


const referralOfferPage = async(req,res)=>{
   const refOffer= await ReferralOffer.find();
   if(refOffer){       
        console.log(refOffer.refererAmount,refOffer.refereeAmount);
       return res.render('referralOffer',{refOffer:refOffer});
    } else
        return res.render('referralOffer'); 
}

const addReferralOffer= async (req,res)=>{
    const {refererAmount,refereeAmount}=req.body;
    const refOffer=   new ReferralOffer({
        refererAmount:parseInt(refererAmount),
        refereeAmount:parseInt(refereeAmount),
        
    });
    await refOffer.save();
    return res.redirect('/admin//referralOffer');
}
const removeReferralOffer = async(req,res)=>{
    const refOfferId=req.params.id;
    console.log(refOfferId);
    const refOffer= await ReferralOffer.findByIdAndDelete(refOfferId);
    console.log(refOffer);   
    return res.redirect('/admin//referralOffer');
 }

module.exports={
    referralOfferPage,
    addReferralOffer,
    removeReferralOffer
}