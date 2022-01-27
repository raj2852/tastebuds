const mongoose = require('mongoose');

var Schema = mongoose.Schema;
var schema = new Schema({
    img: {type:Buffer, required:true},
    category: {type: String, required:true},
    title: {type: String, required: true},
    strike: {type:Number, required:true},
    quantity: {type:String},
    saved: {type:Number, required:true},
    price: {type: Number, required: true},
    veg: {type: String, required:true},
    nonveg: {type: String, required:true}
});

schema.virtual('coverImagePath').get(function (){
    if(this.img != null){
        return `data:${this.imgType};charset=utf-8;base64,${this.img.toString('base64')}`;
    }
})

module.exports = mongoose.model('Product', schema);