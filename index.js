//declaring dependencies
require('dotenv').config();
const express = require('express');
const hbs = require('hbs');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const jwt = require("jsonwebtoken");
const mailer = require("@sendgrid/mail");
mailer.setApiKey(process.env.SENDGRID_API_KEY);
const User = require("./user");
const Product = require("./product");
var Cart = require('./cart');
var Fav = require("./fav");
var Order = require('./order'); 
const auth = require("./auth");


//initializing app as express app
const app = express();
app.set('trust proxy', 1);

//routing for static files of images and css
app.use(express.static('public'));

//middlewares for cookie-parser and sessions
app.use(cookieParser('SECRET_KEY'));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new MongoDBStore({uri: process.env.MONGO_URI,
collection: 'mysession'}),
  cookie: {maxAge: null,
  secure: true,
}
}));
app.use(function(req, res, next) {
  res.locals.session = req.session;
  next();
});

//accept json format data from the application body
app.use(express.json());
app.use(express.urlencoded({extended:false}));

//setting up views engine
app.set("view engine", "hbs");

//flash message middleware
app.use((req, res, next)=>{
  res.locals.message = req.session.message
  delete req.session.message
  next()
})

//Requests for index page
app.get("/", (req,res) => {
  res.status(200).render('index')
});
app.get("/index", (req,res) => {
  res.status(200).render('index')
})

//Requests for FAQ page
app.get("/faq",(req,res) => {
  res.status(200).render('faq')
})

//Requests for Signup page
app.get("/signup", (req,res) => {
  res.status(200).render('signup')
})

app.post("/signup", async(req,res) => {
  try{
    if(req.body.first_name == '' || req.body.last_name=='' || req.body.phone=='' || req.body.email=='' || req.body.gender=='' ||req.body.Password=='' || req.body.Cpassword == ''){
      req.session.message = {
        type: 'danger',
        intro: 'Empty fields! ',
        message: 'Please insert the requested information.'
      }
      res.status(400).redirect('/signup')
    }
    else if(req.body.Password != req.body.Cpassword){
      req.session.message = {
        type: 'danger',
        intro: 'Passwords do not match! ',
        message: 'Please make sure to insert the same password.'
      }
      res.status(400).redirect('/signup')
    }
    else if(req.body.password === req.body.first_name){
      req.session.message = {
        type: 'danger',
        intro: 'Password too weak! ',
        message: 'Please dont use your name singly as your password.'
      }
      res.status(400).redirect('/signup')
    }
    const email = req.body.email;
    let user = await User.findOne({email});
    if(user){
      req.session.message = {
        type: 'danger',
        intro: 'Email already exists! ',
        message: 'Please try login or signup with a different email.'
      }
      res.status(400).redirect('/signup')
    }
    else{
      req.session.message = {
        type: 'success',
        intro: 'You are now registered! ',
        message: 'Please log in.'
      }
      const password = req.body.Password;
      const confirmpassword = req.body.Cpassword;
      const user = new User({
        first_name : req.body.first_name,
        last_name : req.body.last_name,
        gender : req.body.gender,
        phone : req.body.phone,
        email : req.body.email,
        Password : req.body.Password,
        Cpassword: req.body.Cpassword,
    })
    //password hashing
    const createUser = await user.save();
    const name = createUser.first_name;
    const email = createUser.email;
    const welcome = {
      to: email,
      from: {name: "Tastebuds-in", email:"service.rajprojects@gmail.com",},
      subject: "Welcome to Tastebuds Family",
      html: `<body>
      <p>Hello ${name},</p>
      <br>
      <p>Thanks for registering with Tastebuds-in. We are so happy to have you and hereby welcome you warmly to our Tastebuds family. Thanks for choosing us to serve your tastebuds!.</p>
      <br>
      <p>Perks of using Tastebuds:
      <ul>
      <li>Get the best quality food of your locality, because we hire the best quality chefs from your locality.</li>
      <li>Order for any house party/occasion by customizing and specifying the foods you need by just dropping us a mail atleast 3 days earlier.</li>
      <li>We know you might not feel the energy to order at the time you are really hungry, so we offer the facility to customize your delivery date and time.</li>
      </ul>
      <br>
      Wait...The last perk sounds crazy right? Place an order at <a href="https://tastebuds-in.herokuapp.com">Tastebuds</a> and watch how we flex according to your delivery schedule.</p>
      </body>`
    }
    await mailer.send(welcome);
    res.status(201).redirect('login')
    }
  }catch(err){
      res.status(400).send(err);
  }  
})

//Requests for login page
app.get("/login",(req,res) => {
  res.status(200).render('login')
})

app.post("/login", async(req,res) => {
  try{
      const email = req.body.email;
      const password = req.body.Password;
      const cmail = await User.findOne({email:email}); 
      
      const isMatch = await bcrypt.compare(password, cmail.Password);
      if(isMatch){
        req.session.message = {
          type: 'success',
          intro: 'You are now logged in!',
          message: ''
        }
        const token = await cmail.generateAuthToken();
        res.cookie('token', token, {
            expires: null,
            secure: true,
            httpOnly: true
        });
          res.status(200).redirect('main');
      }
      else{
        req.session.message = {
          type: 'danger',
          intro: 'Password did not match ',
          message: 'Please recheck your password.'
        }
          res.status(400).redirect('login');
      }
  }
  catch(err){
    req.session.message = {
      type: 'danger',
      intro: 'Email not found!',
      message: 'Please check your registered mail or consider signing up.'
    }
      res.status(400).redirect('login');
  }
})

//Requests for forgot-password page
app.get("/forgot-password",(req,res) => {
  res.status(200).render('forgot-password')
})

app.post("/forgot-password", async(req,res) => {
  const resetemail = req.body.resetemail;
  let registeredemail = await User.findOne({email:resetemail});
  
  if(registeredemail===null){
    req.session.message = {
      type: 'danger',
      intro: 'This email is not registered!',
      message: 'Please check your email',
    }
    res.status(400).redirect('forgot-password');
  }
  else{
    req.session.message = {
      type: 'success',
      intro: 'Password-reset link sent',
      message: 'Please check all folders of your email',
    }
    const RESET_SECRET = process.env.RESET_SECRET;
    const reset = RESET_SECRET + registeredemail.Password;
    const payload = {
      id: registeredemail._id.toString(),
      email: registeredemail.email,
    }
    const resettoken = jwt.sign(payload, reset, {expiresIn: '15m'})
    const link = `http://localhost:${port}/reset-password/${registeredemail._id.toString()}/${resettoken}`
    console.log(link)
    var h = new Date().getHours();
    var m = new Date().getMinutes();
    const name = registeredemail.first_name;
    /*Actual link template:*/
    const content = {
                    to: resetemail,
                    from: {name: "Tastebuds-in", email:"service.rajprojects@gmail.com"},
                    subject: "Password Reset Addressal",
                    html: `<body>
                    <p>Dear ${name},</p>
                    <br>
                    <p>We received a request to reset your account's password at <b>${h} : ${m}.Click the Reset password link to get access for reseting your password.</b></p>
                    <br>
                    <a href="https://tastebuds-in.herokuapp.com/reset-password/${registeredemail._id.toString()}/${resettoken}">Reset password</a>
                    <br>
                    <p>Click <a href="https://tastebuds-in.herokuapp.com/help/${registeredemail._id.toString()}">Help</a> if not requested by you.</p>
                    </body>`
    }
    await mailer.send(content)
    res.status(200).redirect('forgot-password')
  }
});

//Request for HELP by user
app.get('/help/:id',async(req,res) => {
  const id = req.params.id;
  await User.findByIdAndDelete(id);
  req.session.message = {
    type: 'success',
    intro: 'Security measures taken!',
    message: 'Your account has been deleted, please make a fresh signup',
  }
  res.clearCookie("token");
  res.status(200).redirect('/signup');
})

//Request for reset-password page
app.get('/reset-password/:id/:resettoken', async(req,res) => {
  try{
  const id = req.params.id;
  const resettoken = req.params.resettoken; 
  const validuser = await User.findOne({_id:id});
  if(validuser===null){
    req.session.message = {
      type: "danger",
      intro: "Not a valid reset link!",
      message: ""
    }
    res.redirect('error')
  }
  else{
    const RESET_SECRET = process.env.RESET_SECRET;
    const reset = RESET_SECRET + validuser.Password;
    const payload = jwt.verify( resettoken, reset );
    //console.log(payload)
    res.render('reset-password')
  }
}
catch(err){
  res.redirect('forgot-password');
}
});

app.post('/reset-password/:id/:resettoken', async(req,res) => {
  const id = req.params.id;
  const password = req.body.password;
  const cpassword = req.body.cpassword;
  const validuser = await User.findOne({_id:id})
  const prevpassword = validuser.Password;
  const newpassword = await bcrypt.hash(password, 10);
  const isMatch = await bcrypt.compare(password,prevpassword);
  //console.log(newpassword)
  if(password!==cpassword){
    req.session.message ={
      type: 'danger',
      intro: 'Passwords do not match',
      message: ''
    }
    res.status(400).send("Passwords did not match. Retry by visiting the secret link sent.")
  }
  else if(isMatch){
    req.session.message = {
      type: 'danger',
      into: 'Try a different one!',
      message: ''
    }
    res.status(400).send("Try with a different one.Retry by visiting the secret link sent.")
  }
  else{
    req.session.message = {
      type: 'success',
      intro: 'Password Changed!',
      message: 'Login with new password'
    }
    await User.findByIdAndUpdate(id,{Password: newpassword})
    const mail = validuser.email;
    const name = validuser.first_name;
    var h = new Date().getHours()
    var m = new Date().getMinutes()
    const pswdrstmail = {
      to: mail,
      from: {name: "Tastebuds-in", email:"service.rajprojects@gmail.com"},
      subject: "Password changed",
      html: `<p>Dear ${name},</p>
      <br>
      <p>Your password has been changed by requesting for password reset at <b>${h}:${m}</b>. If not done by you, click <a href="https://tastebuds-in.herokuapp.com/help/${validuser._id.toString()}">HELP</a>.</p>`
    }
    await mailer.send(pswdrstmail)
    res.status(200).redirect('/login')
  }
})

//Request for main page
app.get("/main",(req,res,next) => {
  Product.find(function(err, docs){
      var productChunks = [];
      var chunkSize = 2;
      for(var i=0;i<docs.length; i+= chunkSize){
          productChunks.push(docs.slice(i,i+chunkSize));
      }
      res.status(200).render('main',{products: productChunks})
  });    
});

/*Requests for upload products page
app.get("/upload",auth,async(req,res)=> {
  try{
      const product  = await Product.find();
      res.status(200).render("upload", {
        product
      });
    }catch (err){
      console.log("err: "+ err); 
    }
  res.status(200).render('upload')
});

app.post('/add', async ( req, res, next)=>{
  const {title, category, strike, quantity, saved, price, veg, nonveg, img} = req.body;
  const product = new Product({
    title,
    category,
    strike,
    quantity,
    saved,
    price,
    veg,
    nonveg
  });
  // SETTING IMAGE AND IMAGE TYPES
  try{
      saveImage(product, img);
    const newProduct = await product.save();
    console.log(newProduct);  
    res.status(201).redirect('/upload')
  }catch (err){
    console.log(err);    
  }
});
const imageMimeTypes = ["image/jpeg", "image/png", "images/gif"];
function saveImage(product, imgEncoded) {
  // CHECKING FOR IMAGE IS ALREADY ENCODED OR NOT
  if (imgEncoded == null) return;
  // ENCODING IMAGE BY JSON PARSE
  // The JSON.parse() method parses a JSON string, constructing the JavaScript value or object described by the string
  try{
  const img = JSON.parse(imgEncoded);
  //console.log( "JSON parse: "+ img);
  // CHECKING FOR JSON ENCODED IMAGE NOT NULL 
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
  // AND HAVE VALID IMAGE TYPES WITH IMAGE MIME TYPES
  if (img != null && imageMimeTypes.includes(img.type)) {
    // https://nodejs.org/api/buffer.html
    // The Buffer class in Node.js is designed to handle raw binary data. 
    // SETTING IMAGE AS BINARY DATA
    product.img = new Buffer.from(img.data, "base64");
    product.imgType = img.type;
  }
}catch(err){
  console.log(err);
}
}*/

//Request for user profile page
app.get("/profile", auth, async(req,res) => {
  const token = req.cookies.token;
        const verifyUser = jwt.verify(token, process.env.SECRET_KEY);
          const user = await User.findOne({_id:verifyUser._id});
    res.status(200).render('profile',{first_name:user.first_name, last_name:user.last_name, email:user.email, gender:user.gender, phone:user.phone})
})
 
app.post("/update", async(req,res) => {
  try{
    const token = req.cookies.token;
  const verifyUser = jwt.verify(token, process.env.SECRET_KEY);
  const _id = verifyUser._id;
  const updatedUser = await User.findByIdAndUpdate(_id, req.body, {new: true});
  req.session.message = {
    type: 'success',
    intro: 'Profile updated ',
    message: 'Please check updated details.'
  }
  //console.log(updatedUser); 
  function replace(key,value){
    if (key=="_id") return undefined;
    if (key=="Password") return undefined;
    if (key=="tokens") return undefined;
    if (key=="__v") return undefined;
    else return value;
  }
  let newuser = JSON.stringify(updatedUser,replace)
  const verifyuser = await User.findById(_id);
  const mail = verifyuser.email;
  const name = verifyuser.first_name;
  var h = new Date().getHours()
    var m = new Date().getMinutes()
  const updatemessage = {
    to: mail,
    from: {name: "Tastebuds-in", email:"service.rajprojects@gmail.com"},
    subject: "Profile updated",
    html: `<p>Dear ${name},</p>
    <br>
    <p>Your profile details were updated at <b>${h} : ${m}</b>. Your new profile details is mentioned below.</p>
    <br>
    ${newuser}
    <br>
    <p>If not done by you, click <a href="https://tastebuds-in.herokuapp.com/help/${verifyUser._id.toString()}">HELP</a>.</p>`
  }
  mailer.send(updatemessage)
  res.status(201).redirect('/profile');
  }
  catch(err){
    res.status(400).send(err);
  }
})

app.post("/changepassword", async(req,res) => {
    const token = req.cookies.token;
  const verifyUser = jwt.verify(token, process.env.SECRET_KEY);
  const id = verifyUser._id;
  const user = await User.findOne({_id:verifyUser._id});
  const newpassword = req.body.password;
  const cnewpassword = req.body.cpassword;
  const hashedpassword = await bcrypt.hash(newpassword, 10);
  const isMatch = await bcrypt.compare(newpassword, user.Password);
  //console.log(hashedpassword)
  if(newpassword!==cnewpassword){
    req.session.message ={
      type: 'danger',
      intro: 'Passwords do not match',
      message: ''
    }
    res.status(400).redirect('/profile')
  }
  else if(isMatch){
    req.session.message = {
      type: 'danger',
      intro: 'Try a different one!',
      message: ''
    }
    res.status(400).redirect('/profile')
  }
  else{
    req.session.message = {
      type: 'success',
      intro: 'Password Changed!',
      message: 'Login with new password'
    }
    await User.findByIdAndUpdate(id,{Password: hashedpassword}); 
    const mail = user.email;
    const name = user.first_name;
    var h = new Date().getHours()
    var m = new Date().getMinutes()
    const pswdchngmail = {
      to: mail,
      from: {name: "Tastebuds-in", email:"service.rajprojects@gmail.com"},
      subject: "Password changed",
      html: `<p>Dear ${name},</p>
      <br>
      <p>Your password has been changed by logging into your account at <b>${h}:${m}</b>. If not done by you, click <a href="https://tastebuds-in.herokuapp.com/help/${user._id.toString()}">HELP</a>.</p>
      `
    }
    await mailer.send(pswdchngmail)
      res.clearCookie("token");
  res.status(201).redirect('/login');
  }
})

//GET request for favourites page
app.get("/fav",auth,(req,res) => {
  if (!req.session.fav) {
    return res.status(400).render('fav', {products: null});
} 
 var fav = new Fav(req.session.fav);
 res.status(200).render('fav', {products: fav.generateArray()});
})

app.get('/fav/:id',auth, (req,res) => {
  var productId = req.params.id;
    var fav = new Fav(req.session.fav ? req.session.fav : {});
    Product.findById(productId, function(err, product){
        if(product){
          req.session.message = {
            type: 'success',
            intro: 'Succesfully added to your favourites!',
            message: 'Please continue shopping'
          }
          fav.add(product, product.id);
          req.session.fav = fav;
          //console.log(req.session.fav);
          res.status(200).redirect('/main')
        }
        else if(err){
          return res.status(400).redirect('/main');
      }
    });    
})

app.get('/move/:id',auth, function(req, res, next) {
  var productId = req.params.id;
  var fav = new Fav(req.session.fav ? req.session.fav : {});

  fav.moveItem(productId);
  req.session.fav = fav;
  res.status(200).redirect('/fav');
});

//cart page get request
app.get('/cart',auth, function(req, res, next) {
  if (!req.session.cart) {
      return res.status(400).render('cart', {products: null});
  } 
   var cart = new Cart(req.session.cart);
   res.status(200).render('cart', {products: cart.generateArray(), totalPrice: cart.totalPrice});
 });
 
 app.get('/add-to-cart/:id',auth, (req,res) => {
   var productId = req.params.id;
   var cart = new Cart(req.session.cart ? req.session.cart : {});
   Product.findById(productId, function(err, product){
       if(product){
       req.session.message = {
         type: 'success',
         intro: 'Succesfully added to cart!',
         message: 'Please continue shopping'
       }
       cart.add(product, product.id);
       req.session.cart = cart;
       //console.log(req.session.cart);
       res.status(200).redirect('main')
     }
     if(err){
           return res.status(400).redirect('/main');
       }
   });    
 });
 
 app.get('/remove/:id',auth, function(req, res, next) {
   var productId = req.params.id;
   var cart = new Cart(req.session.cart ? req.session.cart : {});
 
   cart.removeItem(productId);
   req.session.cart = cart;
   res.status(200).redirect('/cart');
 });

//Requests for checkout page
app.get("/checkout",auth, (req,res)=> {
  if(!req.session.cart){
    res.status(400).redirect('cart');
}
var cart = new Cart(req.session.cart);
res.status(200).render('checkout',{total: cart.totalPrice})
})

app.post("/checkout",auth, async(req,res) => {
  try{
    const token = req.cookies.token;
  const verifyUser = jwt.verify(token, process.env.SECRET_KEY);
  const _id = verifyUser._id;
  const user = await User.findOne({_id:verifyUser._id})
  const ordermail = user.email;
  const ordername = user.first_name;
    var cart = new Cart(req.session.cart);
    if (!req.session.cart) {
      return res.redirect('/cart');
    }
    else{
      req.session.message = {
        type: 'success',
        intro: 'Order confirmed! ',
        message: 'Please match the order id sent via email with the one mentioned in the package to be delivered'
      }
      var order = new Order({
        user: _id,
        cart: cart,
        phone: req.body.phone,
        zip: req.body.zip,
        city: req.body.city,
        address: req.body.address,
        state: req.body.state,
        name: req.body.name,
        email: req.body.email,
        order_date: req.body.order_date,
        date: req.body.date,
        time: req.body.time,
        payment: req.body.pay,
        cardholder: req.body.cardholder,
        cardnumber: req.body.cardnumber,
        expiry: req.body.expiry,
        cvv: req.body.cvv
    });
    const neworder = await order.save();
    const orderid = neworder._id.toString();
    function replace(key,value){
      if(key=="_id") return undefined;
      else if(key=="user") return undefined;
      else if(key=="img") return undefined;
      else if(key=="veg") return undefined;
      else if(key=="nonveg") return undefined;
      else if(key=="cardholder") return undefined;
      else if(key=="cardnumber") return undefined;
      else if(key=="expiry") return undefined;
      else if(key=="__v") return undefined;
      else if(key=="cvv") return undefined;
      else return value;
    }
    let html = JSON.stringify(neworder, replace);
    const ordermailer = {
      to: ordermail,
      from: {name: "Tastebuds-in", email:"service.rajprojects@gmail.com"},
      subject: "Order confirmed",
      html: `<p>Hello ${ordername},</p>
      <br>
      <p>Thank you for ordering with Tastebuds!.We have received your order and the processing has started.Your order id is: <b>${orderid}</b>. Below given is your order details.</p>
      <br>
      <pre>${html}</pre>
      <br>
      <br>
      <strong>Please remember to match the order id provided via this email with the order id mentioned on your package</strong>`
    }
    await mailer.send(ordermailer)
    req.session.cart = null;
    res.status(200).redirect('/submit');
    }
  }catch(err){
    res.status(400).send(err);
  }
})

//Request for payment submit page
app.get("/submit",auth,(req,res) => {
  res.status(200).render('submit')
})

//logout page get request
app.get("/logout", auth, async(req,res) => {
  try{
    req.user.tokens = req.user.tokens.filter((currEle) => {
      return currEle != req.token
    })
    res.clearCookie("token");
    req.session = null;
  res.status(200).render('logout') 
   await req.user.save();
  }
  catch(err){
    res.status(400).send("no logged in user data");
  }
})


app.get("/error", (req,res)=> {
  res.render('error')
})

//anything else 
app.get("*",(req,res) => {
  res.status(400).redirect('/error')
})


/*app.get('/order',auth, async(req, res)=>{
  try{
  const token = req.cookies.token;
  const verifyUser = jwt.verify(token, process.env.SECRET_KEY);
    const user = await User.findOne({_id:verifyUser._id});
  const _id = await verifyUser._id;
  Order.findOne(_id, function(err, orders) {
      if (err) {
          return res.write('Error!');
      }
      var cart;
      orders.forEach(function(order) {
          cart = new Cart(order.cart);
          order.items = cart.generateArray();
      });
      res.render('order', { orders: orders });
  });
}catch(err){
  res.status(400).send(err);
}
});*/

//connecting with database
require('./db.js');
 
//setting up a dynamic hosting port
const port = process.env.PORT || 8002;

//const hostname = 'localhost';
app.listen(port,() =>{
  console.log(`Running at: http://localhost:${port}`);
});

module.exports = app;
