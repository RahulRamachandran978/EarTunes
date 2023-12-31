const userDatabase = require('../schema/user.schema');
const { sendOtp,verifyOtp } = require('../config/twilio');
const { hashPassword,comparePassword} = require('../config/security')
const cloudinary = require('../config/cloudinary')



async function checkUserWithEmail(email,password){
    try{
        const user = await userDatabase.findOne({email:email});
        if(!user){
            return{status :false,message:'Invalid email'};
        }
        if(!user.status){
            return{status:false,message:'User is blocked'};
        }
        const isPasswordMatch = await comparePassword(password,user.password);
        if(isPasswordMatch){
            return {status:true,user:user,message:'Login successfull'};
        }else{
            return {status:false,message:'Invalid password'};
        }
    }catch(error){
        console.log(error)
    }
}

async function checkUserExistOrNot(phoneNumber){
    try {
      const user = await userDatabase.findOne({ phone: phoneNumber });
      if (user) {
        const sendotp = await sendOtp(user.phone)
        if (!sendotp) return { status: false, message: "Unable to send otp sorry bruh" }
        return { status: true, message: "Successfully send" }
      } else {
        return { status: false, message: "User not registered!" };
      }
    } catch (error) {
      console.error(error);
      throw new Error('Error checking user existence');
    }
}

async function verifyPhoneNumber(phoneNumber,otp){
    try{
        const isVerified = await verifyOtp(phoneNumber,otp);
        if(isVerified){
            const user = await userDatabase.findOne({phone:phoneNumber});
            return{status:true,user};
        }else{
            return{status:false}
        }
    }catch(error){
        console.error(error);
        throw new Error('Error verifying phone number');
    }
}

async function sendVerificationSignup(phoneNumber) {
    try {
      const user = await userDatabase.findOne({ phone: phoneNumber });
      if (!user) {
        await sendOtp(phoneNumber);
        return true;
      } else {
        return false; //phone number already registered
      }
    } catch (error) {
      console.error(error);
      throw new Error('Error sending verification code');
    }
  }

async function submitSignup({username,email,phone,password,otp}){
    try{
        const isVerified = await verifyOtp(phone,otp);
        const hashedPassword = await hashPassword(password);
        if(isVerified){
            const user = new userDatabase({
                username :username,
                email :email,
                phone :phone,
                password : hashedPassword,
                status :true,
                profileimage: process.env.PROFILE_PIC,

            });
            await user.save();
            return {status:true,user};
        }else{
            return{status:false,message:'Invalid OTP'}
        }
    }catch(error){
        console.error(error);
        if(error.status === 404){
            throw new Error('Twilio resource not found');
        }else{
            throw new Error('Error submitting signup')
        }
    }
}

async function updateUserData(userData, profilePicture, userId) {
  
  try {
    if (typeof userData !== 'object' || typeof userId !== 'string') {
      throw new Error('Invalid parameters');
    }

    const user = await userDatabase.findById(userId);

    if (!user) {
      throw new Error('User does not exist');
    }

    const isPasswordCorrect = await comparePassword(userData.password, user.password);

    if (!isPasswordCorrect) {
      throw new Error('Incorrect password');
    }

    const dataObj = {};

    if (userData.npassword) {
      dataObj.password = await hashPassword(userData.npassword);
    }

    if (userData.name) {
      dataObj.username = userData.name;
    }

    if (profilePicture) {
      const response = await cloudinary.uploader.upload(profilePicture.path, {
        folder: 'space/profile_images',
        unique_filename: true,
      });
      dataObj.profileimage = response.url;
    }

    const filter = { _id: userId };
    const update = { $set: dataObj };
    const result = await userDatabase.updateOne(filter, update);
    const updatedUser = await userDatabase.findById(userId)
    

    if (result.modifiedCount > 0) {
      return { status: true, message: 'Updated successfully',user:updatedUser};
    } else {
      throw new Error('Updation failed');
    }
  } catch (error) {
    console.error(error.message);
    return { status: false, message: error.message };
  }
}

async function resetPassword(phone, password){
    try {
      const user = await userDatabase.findOne({phone})
      if(!user){
        throw new Error('user does not exist!')
      }
      if(!user.status){
        return {status: false, message: 'User is blocked'}
      }
      const dataObj = {};
      dataObj.password = await hashPassword(password);
      const result = await userDatabase.findOneAndUpdate(
        { phone: parseFloat(phone) },
        { $set: { password: dataObj.password } },
        { new: true }
      );
      if (result) {
        return { status: true, message: 'Updated successfully'};
      } else {
        return { status: false, message: 'Not updated' };
      }
    } catch (error) {
      console.error(error.message);
      return { status: false, message: error.message };
    }
  }
  async function fetchUserData(userId){
    try {
      const userDetail = await userDatabase.findById(userId);
       if(!userDetail){
        return {status:false, message:'User could not be found try to login!'}
       }else{
        return { status: true, userDetail};
       }
    } catch (error) {
      throw new Error("error checking user Existance!")
    }
  }




module.exports ={
    checkUserWithEmail,
    checkUserExistOrNot,
    verifyPhoneNumber,
    sendVerificationSignup,
    submitSignup,
    updateUserData,
    resetPassword,
    fetchUserData,
};