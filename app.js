const express = require('express');
const app=express();
const env =require('dotenv').config();
const  path = require('path');
const session=require('express-session');
const passport= require('./config/passport');
const bodyParser=require('body-parser');
const morgan = require('morgan');

require("./helpers/cronJobs"); // This will automatically run the cron job


const PORT= process.env.PORT 
const mongoose= require('mongoose');
const dbConnect =require('./config/dbConnect');
const userRouter= require('./routes/user/userRouter');
const adminRouter= require('./routes/admin/adminRouter');

morgan('combined', {
    skip: function (req, res) { return res.statusCode < 400 }
  })
dbConnect();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.use(express.urlencoded({extended:true}));
app.use(function (req, res, next) {
    res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    next();
});
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*6*1000
    }

}))

app.use(express.json());
app.set('view engine','ejs');
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')]);
app.use(express.static(path.join(__dirname,'public')));
// app.use('./uploads',express.static(path.join(__dirname,'uploads')));

app.use(passport.initialize());
app.use(passport.session());
app.use('/',userRouter);
app.use('/admin',adminRouter);



app.listen(PORT,()=>console.log(`Server running at PORT${PORT}`));



