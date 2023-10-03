const{
    addOrderDetails,
    getAddresses,
    addAddress,
    deleteAddress,
    verifyPayment,
    changePaymentStatus,
    cancelOrder,
    returnOrder,
    getAllOrders,
    changeOrderStatus,
    getUserData,
    getOrderdetails,
    orderStatus,
    setSuccessStatus,
    getWallet,
    updateWalletData,
}=require('../models/order.model')

const {cartProductTotal}=require('../models/cart.model');
const productDatabase = require('../schema/product.schema');
const { generateRazorpay } = require('../config/razorpay');
const{handleError}=require('../middleware/error.handler');
const { getAllCoupons,addCouponData} = require('../models/coupon.model');


/**
 * This function retrieves user addresses and cart product total and renders the checkout page with the
 * addresses if available, otherwise an empty array, or redirects to the cart page if the cart is
 * empty.
 * @param req - The `req` parameter is an object representing the HTTP request made by the client. It
 * contains information such as the request method, URL, headers, and any data sent in the request
 * body.
 * @param res - `res` is the response object that is used to send the HTTP response back to the client.
 * It is an instance of the `http.ServerResponse` class in Node.js. It is used to set the response
 * headers, status code, and send the response body. In this code snippet, `
 */

async function GetCheckout(req, res) {
  try {
    const cartResult = await cartProductTotal(req.session.user._id);
    const coupons = await getAllCoupons();
    if (cartResult.cart) {
      cartResult.cart.items.forEach(async (item) => {
        const product = await productDatabase.find({ _id: item.product });
        if (product[0].stocks < item.quantity) {
          return res.redirect('/cart');
        }
      });
    }

    const result = await getAddresses(req.session.user._id, res);
    const userWallet = await getUserData(req.session.user._id);
    if (cartResult.status) {
      if (result.status) {
        let discountAmount;
        let couponcode;
        if (req.session.coupon) {
          const coupon = req.session.coupon;
          couponcode = coupon.code;
          discountAmount = (coupon.discount / 100) * cartResult.cart.total;
        } else {
          discountAmount = 0;
          couponcode = null;
        }

        let appliedWallet;
        if (req.session.appliedWallet) {
          appliedWallet = req.session.appliedWallet
        }

        return res.render('user/checkout', {
          addresses: result.addresses,
          walletAmount: userWallet.amount,
          coupons: coupons,
          couponDiscount: discountAmount,
          couponcode: couponcode,
          appliedWallet: appliedWallet
        });
      } else {
        return res.render('user/checkout', {
          addresses: [],
          walletAmount: userWallet.amount,
          coupons: [],
        });
      }
    } else {
      return res.redirect('/cart');
    }
  } catch (error) {
    handleError(res, error);
  }
}


/**
 * This is an asynchronous function that adds an address to a user's account and returns a success or
 * failure message in JSON format.
 * @param req - The req parameter is an object that represents the HTTP request made to the server. It
 * contains information such as the request method, headers, URL, and request body. In this case, it is
 * being used to extract the request body and the user ID from the session.
 * @param res - The `res` parameter is the response object that is used to send the HTTP response back
 * to the client. It contains methods and properties that allow you to set the response status code,
 * headers, and body. In this case, it is being used to send a JSON response with a success flag and
 * @returns This function returns a JSON response with a success status and a message. If the
 * `addAddress` function returns a status of `true`, the success status is set to `true` and the
 * message is set to the `message` property of the `addressResult` object. If the `addAddress` function
 * returns a status of `false`, the success status is set to `false` and
 */

async function AddAddress(req, res) {
    try {
        const addressResult = await addAddress(req.body, req.session.user._id);

        if (addressResult.status) {
            return res.json({ success: true, message: addressResult.message });
        } else {
            return res.json({ success: false, message: addressResult.message });
        }
    } catch (error) {
        handleError(res, error);
    }
}


async function DeleteAddress(req,res){
    try{
        const addressResult = await deleteAddress(req.body.id);
        if(addressResult){
            res.redirect('/account');
        }else{
            res.redirect('/account');
        }
    }catch(error){
        handleError(res,error);
    }
}

/**
 * This function handles the HTTP POST request for checkout and generates the appropriate response
 * based on the payment method selected.
 * @param req - The request object represents the HTTP request that was sent by the client to the
 * server.
 * @param res - The "res" parameter is the response object that is used to send the response back to
 * the client making the HTTP request. It contains information such as the status code, headers, and
 * body of the response.
 * @returns a JSON response with different properties depending on the payment method selected by the
 * user. If the payment method is 'cashOnDelivery', the response includes a success flag, the payment
 * method used, and a message indicating that the order details were added successfully. If the payment
 * method is 'razorpay', the response includes the same properties as before, plus an additional
 * property 'order' that
 */

async function PostCheckout(req,res){
    try{
        const {paymentmethod,addressId} = req.body;
        const checkoutResult = await addOrderDetails(
            addressId,
            paymentmethod,
            req.session.user._id,
            req,
            res,
        );
        let cartTotal = checkoutResult.cartResult.total;
        if(req.session.coupon){
            let coupon = req.session.coupon;
            const discountAmount = (coupon.discount / 100) * cartTotal;
            cartTotal = cartTotal-discountAmount;
        }

        if(req.session.appliedWallet){
            cartTotal = cartTotal - req.session.appliedWallet;
        }
        if(cartTotal<1){
            await orderStatus(checkoutResult.order._id);
            return res.json({
                success:true,
                paymentmethod:'COD',
                message:'order details added!order with wallet amount',
                orderId:checkoutResult.order._id,
            })
        }

        if(checkoutResult.status){
            if(paymentmethod === 'cashOnDelivery'){
                return res.json({
                    success:true,
                    paymentmethod:'COD',
                    message:'order details added!',
                    orderId:checkoutResult.order._id,
                });
            } else if (paymentmethod === 'razorpay') {
                console.log('hiujewsijewjejjndsghbsdrazxow3eoiewhhij')
                const razorPayOrder = await generateRazorpay(checkoutResult.order);
                return res.json({
                  success: true,
                  paymentmethod: 'ONLINE',
                  message: 'order details added!',
                  order: razorPayOrder,
                });
              }
        }else{
            return res.json({success:false,message:'something went wrong'});
        }
    }catch(error){
        handleError(res,error);
    }
}
/**
 * This is an asynchronous function that cancels an order and returns a success or failure message in
 * JSON format.
 * @param req - The request object containing information about the incoming HTTP request.
 * @param res - The `res` parameter in the `httpCancelOrder` function is an object representing the
 * HTTP response that will be sent back to the client. It contains methods and properties that allow
 * the server to send data, headers, and status codes back to the client.
 */

async function CancelOrder(req,res){
    try{
        const { id,cancelreason} = req.body;
        const cancelResult = await cancelOrder(id,cancelreason);
        if(cancelResult){
            res.json({message:'order canceled succefully',success:true});
        }else{
            res.json({success:false,message:'something wrong! cancelled operation failed'});
        }
    }catch(error){
        handleError(res,error);
    }
}

async function ReturnOrder(req,res){
    try{
        const{id,retrunReason} = req.body;
        const cancelResult = await returnOrder(id,retrunReason);
        if(cancelResult){
            res.json({message:'order return successfully',success:true});
        }else{
            res.json({success:false,message:'something wrong! return operation failed'});
        }
    }catch(error){
        handleError(res,error)
    }
}

async function GetOrderPage(req,res){
    try{
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const orderResult = await getAllOrders(page,limit);
        console.log(orderResult)
        if(orderResult.status){
            return res.render('admin/orders',{
                orders : orderResult.orders,
                message:orderResult.message,
                totalPages:orderResult.totalPages,
                currentPage:orderResult.currentPage,
                limit:orderResult.limit,
                activePage:'orders',

            });
        }else{
            return res.render('admin/orders',{
                orders:[],
                message:orderResult.message,
                totalPages:orderResult.totalPages,
                currentPage:orderResult.currentPage,
                limit:orderResult.limit,
                activePage:'orders',
            });
        }
    }catch(error){
        handleError(res,error);
    }
}

async function ChangeOrderStatus(req, res) {
    try {
      const { orderId, status } = req.body;
      const result = await changeOrderStatus(status, orderId);
      if (result.status) {
        return res.json({ success: true, message: result.message });
      } else {
        return res.json({ success: false, message: result.message });
      }
    } catch (error) {
      handleError(res, error);
    }
  }
  

async function GetOrderDetails(req,res){
    try{
        const orderId = req.query.id;
        const admin = req.query.admin;
        const result = await getOrderdetails(orderId);
        if(result.status){
            if(admin && req.session.adminLoggedIn){
                return res.render('admin/order-details',{
                    orderData:result.orderData,
                    activePage:'orders',
                });
            }
            return res.render('user/order-details',{orderData:result.orderData});
        }else{
            return res.redirect('/404');
        }
    }catch(error){
        handleError(res,error);
    }
}

async function SuccessPage(req, res) {
    try {
      const id = req.params.id;
  
      await setSuccessStatus(id);
  
      if (req.session.coupon) {
        await addCouponData(req.session.coupon, req.session.user._id);
        delete req.session.coupon;
      }
  
      if(req.session.appliedWallet){
        await updateWalletData(req.session.appliedWallet,req.session.user._id,id);
        delete req.session.appliedWallet;
      }
      res.render('user/success-page');
    } catch (error) {
      handleError(res, error);
    }
  }

  async function FailedPage(req, res) {
    if (req.session.coupon) {
      delete req.session.coupon;
    }
    
    if(req.session.appliedWallet){
      delete req.session.appliedWallet;
    }
    res.render('user/failed-page');
  }

  async function VerifyPayment(req, res) {
    try {
      const verifyResult = await verifyPayment(req.body, res);
      if (verifyResult) {
        let razorpay_payment_id = req.body['payment[razorpay_payment_id]'];
        let razorpay_order_id = req.body['payment[razorpay_order_id]'];
        let razorpay_signature = req.body['payment[razorpay_signature]'];
        let paymentDetails = { razorpay_payment_id, razorpay_order_id, razorpay_signature };
        const changePaymentResult = await changePaymentStatus(
          req.body['order[receipt]'],
          paymentDetails,
        );
        if (changePaymentResult) {
          return res.json({ success: true, message: 'payment result updated' });
        } else {
          return res.json({
            success: false,
            message: 'something goes wrong!payment result not updated',
          });
        }
      }
    } catch (error) {
      handleError(res, error);
    }
}

async function GetWallet(req, res) {
    try {
      const walletAmount = await getWallet(req.session.user._id);
      if (walletAmount.status) {
        return res.render('user/wallet', {
          walletAmount: walletAmount.amount,
          walletPending: walletAmount.pendingWallet,
        });
      } else {
        return res.render('user/wallet', {
          walletAmount: walletAmount.amount,
          walletPending: walletAmount.pendingWallet,
        });
      }
    } catch (error) {
      handleError(res, error);
    }
  }

  async function ApplyWallet(req, res) {
    try {
      const walletAmount = req.body.walletInput;
      const userId = req.session.user._id;
      const result = await cartProductTotal(userId);
      const response = await getUserData(userId);
      if (!result.status) {
        return res.status(404).json({ success: false, message: 'something wrong!cart not found' });
      }
  
      let cart = result.cart;
      let totalWallet = response.amount;
      let cartTotal = cart.total;
      let maxAmount;
  
  
      // if (req.session.coupon) {
      //   let coupon = req.session.coupon;
      //   const discountAmount = (coupon.discount / 100) * cartTotal;
      //   cartTotal = cartTotal - discountAmount;
      // }
  
      if (totalWallet > cartTotal) {
        maxAmount = cartTotal;
      } else {
        maxAmount = totalWallet;
      }
  
      if (maxAmount < walletAmount) {
        return res.status(400).json({ success: false, message: 'Oops!Wrong wallet amount' });
      }
  
      cartTotal = cartTotal - walletAmount;
      let walletBalance = totalWallet - walletAmount;
      req.session.appliedWallet = walletAmount;
  
      return res.json({ success: true, cartTotal, walletBalance });
    } catch (error) {
      handleError(res, error);
    }
  }

module.exports={
    GetCheckout,
    AddAddress,
    DeleteAddress,
    PostCheckout,
    CancelOrder,
    ReturnOrder,
    GetOrderPage,
    ChangeOrderStatus,
    GetOrderDetails,
    SuccessPage,
    FailedPage,
    VerifyPayment,
    GetWallet,
    ApplyWallet,
}