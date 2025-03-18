

const aboutUs=async(req,res)=>{
    res.render('about');
}
const contactUs=async(req,res)=>{
    res.render('contactUs');
}

module.exports={
    aboutUs,
    contactUs
}