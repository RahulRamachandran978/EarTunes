function handleError(res,error){
    console.log('💥',error);
    res.status(500).json({status:false,message:error?.message});
}

module.exports = {handleError}