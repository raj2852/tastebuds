var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    user: {type: String, required: true},
    cart: {type: Object, required: true},
    zip: {type: Number, required: true},
    city: {type: Array, required: true},
    address: {type: String, required: true},
    state: {type: String, required: true},
    phone: {type:Number, required: true},
    email: {type: String, required:true},
    name: {type: String, required: true},
    order_date: {type: String},
    date: {type: String, required: true},
    time: {type:String, required:true},
    payment: {type:String, required: true},
    cardnumber: {type:Number,},
    cardholder: {type:String},
    expiry: {type:String},
    cvv: {type:Number}
});

module.exports = mongoose.model('Order', schema);