const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGO_URL;

mongoose.connection.once('open',()=>{
    console.log('MongoDB connected successfuly !🚀')
});

mongoose.connection.on('error',(err)=>{
    console.error('Database connection failed 😣😣'+err)
});

async function mongoconnect(){
    await mongoose.connect(uri,{
        useNewUrlParser :true,
        useUnifiedTopology:true,
    })
}

module.exports = {mongoconnect}