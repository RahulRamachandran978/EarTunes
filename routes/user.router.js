const express = require('express');
const userRouter = express.Router();
const upload = require('../config/multer')
const isAuth=require('../middleware/auth.handler');



const {
    GetHome,
    GetSignup, 
    GetLogin,
    PostLoginVerify,
    PostSignup,
    SignupOtpVerify,
    GetOtpLogin,
    LoginVerifyPhone,
    GetOtpVerify,
    PostOtpVerify,
    GetAccount,
    UpdateUserdata,
    GetLogout,
    GetChangePassword,
    GetForgotPassword,
    PostResetPassword,
    VerifyPhone,
    VerifyOtp,
    GetInvoice,
} = require('../controllers/user.controller')


const {
    GetProduct,
    GetAllProducts,
    CategoryProduct,
    ProductsBySearch,
    SearchResult,
    PostReview,
    DeleteReview,
}= require('../controllers/product.controller')

const {
    GetCart,
    PostToCart,
    RemoveFromCart,
    ClearCart,
    UpdateQuantity,
    GetWishlist,
    PostToWishlist,
    RemoveFromWishlist,
} = require('../controllers/cart.controller')

const{
    GetCheckout,
    AddAddress,
    PostCheckout,
    DeleteAddress,
    VerifyPayment,
    SuccessPage,
    FailedPage,
    CancelOrder,
    ReturnOrder,
    GetOrderDetails,
    GetWallet,
    ApplyWallet,

}=require('../controllers/order.controller');
const { updateUserData, verifyPhoneNumber } = require('../models/userAuth.model');
const { verifyOtp } = require('../config/twilio');
const {Applycoupon,RemoveCoupon} = require('../controllers/coupon.controller');
const {GetAbout,GetContact} = require('../controllers/page.controller');

//user Routes
userRouter.get('/',GetHome);
userRouter.get('/login',isAuth.isLoggedOut,GetLogin);
userRouter.post('/login',PostLoginVerify);
userRouter.get('/otp-login',isAuth.isLoggedOut,GetOtpLogin);
userRouter.post('/otp-login',LoginVerifyPhone);
userRouter.get('/otp-verify',isAuth.isLoggedOut,GetOtpVerify);
userRouter.post('/otp-verify',isAuth.isLoggedOut,PostOtpVerify);

userRouter.get('/signup',isAuth.isLoggedOut,GetSignup);
userRouter.post('/signup',isAuth.isLoggedOut,PostSignup);
userRouter.post('/signup-otp',isAuth.isLoggedOut,SignupOtpVerify)
userRouter.get('/change-password',isAuth.isLoggedIn,GetChangePassword)
userRouter.post('/change-password',isAuth.isLoggedIn,updateUserData);

//forgot password
userRouter.get('/forgot-password',GetForgotPassword);
userRouter.post('/forgot-password/otp', VerifyPhone);
userRouter.post('/forgot-password/otp-verify',VerifyOtp);
userRouter.post('/reset-password', PostResetPassword);

userRouter.get('/product/:slug',GetProduct);
userRouter.get('/shop',GetAllProducts);
userRouter.get('/shop/:id',CategoryProduct)

//wishlist
userRouter.get('/wishlist', isAuth.isLoggedIn, GetWishlist);
userRouter.post('/wishlist', isAuth.isLoggedIn, PostToWishlist);
userRouter.delete('/wishlist', isAuth.isLoggedIn, RemoveFromWishlist);

userRouter.get('/cart',isAuth.isLoggedIn,GetCart);
userRouter.post('/cart',isAuth.isLoggedIn,PostToCart);
userRouter.delete('/cart',isAuth.isLoggedIn,RemoveFromCart);
userRouter.patch('/cart',isAuth.isLoggedIn,UpdateQuantity);
userRouter.delete('/clear-cart',isAuth.isLoggedIn,ClearCart);

userRouter.get('/checkout',isAuth.isLoggedIn,GetCheckout);
userRouter.post('/checkout',isAuth.isLoggedIn,PostCheckout);
userRouter.post('/add-address',isAuth.isLoggedIn,AddAddress);
userRouter.delete('/delete-address',isAuth.isLoggedIn,DeleteAddress);

userRouter.post('/verify-payment',isAuth.isLoggedIn,VerifyPayment);
userRouter.get('/order-successfull/:id',isAuth.isLoggedIn, SuccessPage);
userRouter.get('/order-failed/:id', isAuth.isLoggedIn, FailedPage);

userRouter.post('/order-cancel',isAuth.isLoggedIn,CancelOrder);
userRouter.post('/order-return',isAuth.isLoggedIn,ReturnOrder)

//coupon
userRouter.post('/apply-coupon',isAuth.isLoggedIn,Applycoupon);
userRouter.put('/remove-coupon',isAuth.isLoggedIn,RemoveCoupon);

//wallet
userRouter.get('/wallet',isAuth.isLoggedIn,GetWallet);
userRouter.post('/apply-wallet', isAuth.isLoggedIn, ApplyWallet);

userRouter.get('/account',GetAccount);
userRouter.get('/order-details', isAuth.isLoggedIn,GetOrderDetails);
userRouter.get('/download-invoice',isAuth.isLoggedIn,GetInvoice);
userRouter.post('/update-userdata', upload.single('profileimage'),isAuth.isLoggedIn,UpdateUserdata);


//product search
userRouter.get('/search', SearchResult);
userRouter.post('/search-products',ProductsBySearch);


userRouter.get('/about',GetAbout);
userRouter.get('/contact',GetContact);

//review
userRouter.post('/product-review',isAuth.isLoggedIn, PostReview);
userRouter.delete('/delete-review/:reviewId',isAuth.isLoggedIn,DeleteReview);

userRouter.get('/logout',GetLogout);


module.exports=userRouter;