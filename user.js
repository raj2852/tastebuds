require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validate = require('validator');
const jwt = require('jsonwebtoken');

//login time user schema
const userSchema = new mongoose.Schema({
    first_name : String,
    last_name : String,
    gender : String,
    phone : Number,
    email : {
        type: String,
        required: true,
        unique: true
    },
    Password : String,
    Cpassword: String,
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }]
})

//middleware for JWT token generation
userSchema.methods.generateAuthToken = async function(){
    try{
        const token = jwt.sign({_id:this._id.toString()}, process.env.SECRET_KEY);
        this.tokens = this.tokens.concat({token:token});
        await this.save();
        //console.log(token);
        return token;
    }
    catch(err){
        res.send(err);
    }
}

//middleware for bcrypt
userSchema.pre("save", async function (next){
    if(this.isModified("Password")){
        //const passwordHash = await bcrypt.hash(Password, 10);
        //console.log(`${this.Password}`);
        this.Password = await bcrypt.hash(this.Password, 10);
        //console.log(`${this.Password}`);
        this.Cpassword = undefined;
    }
    next();
})

//creating collection
const User = new mongoose.model("User",userSchema);

module.exports = User;
