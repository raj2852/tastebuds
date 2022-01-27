require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const User = require('./user');
const app = express();

//middle ware for sessions
app.use(session({cookie: {maxAge: null}})); 

//flash message middleware
app.use((req, res, next)=>{
    res.locals.message = req.session.message
    delete req.session.message
    next()
  })

 //validate user login before rendering 
const auth = async(req,res,next) => {
    try{
        const token = req.cookies.token;
        const verifyUser = jwt.verify(token, process.env.SECRET_KEY);
        const user = await User.findOne({_id:verifyUser._id});
        req.user = user;
        user.first_name;
        user.last_name;
        user.gender;
        user.phone;
        user.email;
        next();
    }
    catch(error){
          res.status(400).redirect('/login');
    }
    
}

module.exports = auth;