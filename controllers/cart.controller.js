const {handleError} = require('../middleware/error.handler');

const{
    addItemToCart,
    removeItemFromCart,
    fetchCartProducts,
    clearCartItems,
    updateCartDetails,
    addItemToWishlist,
    removeItemFromWishlist,
    fetchWishlistProducts,
} = require('../models/cart.model');

/**
 * This function retrieves the cart products of a user and renders them on a webpage.
 * @param req - The request object, which contains information about the incoming HTTP request such as
 * headers, parameters, and body.
 * @param res - The `res` parameter is the response object that will be sent back to the client with
 * the HTTP response. It contains methods and properties that allow the server to send data, headers,
 * and status codes to the client.
 * @returns The function `httpGetCart` is returning a rendered view of the user's cart with the items
 * and total price if the cartResult status is true, and an empty cart with a total of 0 if the status
 * is false. If there is an error, it will be handled by the `handleError` function.
 */

async function GetCart(req,res) {
    try {
      const userId = req.session.user._id;
  
      const cartResult = await fetchCartProducts(userId);
  
      if (cartResult.status) {
        const items = cartResult.cart.items.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          price: item.price,
        }));
  
        return res.render('user/cart', { items, total: cartResult.total });
      } else {
        return res.render('user/cart', { items: [], total: 0 });
      }
    } catch (error) {
      handleError(res, error);
    }
  }

/**
 * This function handles a HTTP POST request to add a product to a user's cart and returns a JSON
 * response with the status, message, and product data.
 * @param req - The request object containing information about the incoming HTTP request.
 * @param res - The `res` parameter is the response object that will be sent back to the client with
 * the result of the HTTP request. It contains methods to set the status code, headers, and body of the
 * response.
 * @returns This function is used to handle an HTTP POST request to add an item to a user's cart. It
 * expects the request to contain a product ID and a quantity. If the request is valid, it calls the
 * `addItemToCart` function with the user ID, product ID, and quantity. If the `addItemToCart` function
 * returns a successful result, the function returns a JSON response with a
 */

async function PostToCart(req,res){
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.user._id;
    
        if (!productId || typeof productId !== 'string') {
          return res
            .status(400)
            .json({ success: false, message: 'Invalid product id' });
        }
        if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
          return res
            .status(400)
            .json({ success: false, message: 'Invalid quantity' });
        }
        const cartResult = await addItemToCart(userId, productId, quantity);
        if (cartResult.status) {
          res
            .status(200)
            .json({ success: cartResult.status, message: cartResult.message ,product:cartResult.productData });
        } else {
          res
            .status(404)
            .json({ success: cartResult.status, message: cartResult.message,product: [] });
        }
      } catch (error) {
        handleError(res, error);
    }
 }

 /**
 * This function removes a product from a user's cart and returns a response with the updated cart
 * total.
 * @param req - The request object containing information about the HTTP request made to the server.
 * @param res - The "res" parameter is the response object that will be sent back to the client with
 * the result of the HTTP request.
 * @returns a response to an HTTP request. The response is either a success message with a status code
 * of 200 and a JSON object containing the status, message, and total, or an error message with a
 * status code of 404 and a JSON object containing the status and message.
 */
 
async function RemoveFromCart(req,res){
    try{
        const {productId} = req.body;
        const userId = req.session.user._id;
        if(!productId || typeof productId !=='string'){
            return res
            .status(400)
            .json({status:false,message:'Invalid product id'});
        }

        const cartResult = await removeItemFromCart(userId,productId);
        if(cartResult.status){
            res
            .status(200)
            .json({status:cartResult.status,message:cartResult.message,total:cartResult.total});
        }else{
            res
            .status(400)
            .json({status:cartResult.stastus,message:cartResult.message});
        }
    }catch(error){
        handleError(res,error)
    }
}


/**
 * This is an asynchronous function that clears the cart items of a user and returns a JSON response
 * indicating success or failure.
 * @param req - The request object, which contains information about the incoming HTTP request such as
 * headers, parameters, and body.
 * @param res - The `res` parameter in the `httpClearCart` function is the response object that will be
 * sent back to the client making the HTTP request. It is used to send a JSON response with a success
 * status and message or an error status and message.
 * @returns This function returns a JSON response with a success status and a message. The success
 * status can be either true or false depending on the result of the clearCartItems function. The
 * message provides information about the status of the cart clearing process. If there is an error,
 * the handleError function is called.
 */

async function ClearCart(req, res) {
    try {
      const cartResult = await clearCartItems(req.session.user._id);
      if (cartResult.status) {
        return res.json({ success: true, message: cartResult.message });
      } else {
        return res.json({ success: false, message: cartResult.message });
      }
    } catch (error) {
      handleError(res, error);
    }
  }
  
  /**
   * This function updates the quantity of a product in a user's cart and returns a JSON response with
   * the updated total and a success or error message.
   * @param req - The request object contains information about the HTTP request that was made, such as
   * the request method, headers, and body.
   * @param res - The "res" parameter is the response object that will be sent back to the client after
   * the function is executed. It contains information such as the HTTP status code, headers, and the
   * response body.
   * @returns a JSON response with either a success message, total quantity and a success flag or an
   * error message and a failure flag.
   */
  async function UpdateQuantity(req, res) {
    try {
      const { quantity, productId } = req.body;
      const userId = req.session.user._id;
  
      const cartResult = await updateCartDetails(quantity, productId, userId);
  
      if (cartResult.status) {
        return res.json({
          success: true,
          message: cartResult.message,
          total: cartResult.total,
        });
      } else {
        return res.json({ success: false, message: cartResult.message });
      }
    } catch (error) {
      handleError(res, error);
    }
  }

  async function GetWishlist(req, res){
    try {
      const userId = req.session.user._id;
      const wishlistResult = await fetchWishlistProducts(userId);
      if (wishlistResult.status) {
        const items = wishlistResult.wishlist.items.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          price: item.price,
        }));
        return res.render('user/wishlist', { items} );
      } 
      return res.render('user/wishlist',{ items: [] })
    } catch (error) {
      handleError(res, error)
    }
  }

  async function PostToWishlist(req, res){
    try {
      const {productId } = req.body;
      const userId = req.session.user._id;
  
      if (!productId || typeof productId !== 'string') {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid product id' });
      }
      const wishlistItem = await addItemToWishlist(userId, productId);
      if (wishlistItem.status) {
        res
        .status(200)
        .json({ success: wishlistItem.status, message: wishlistItem.message, product: wishlistItem.productData ,productAlreadyExist:wishlistItem.productAlreadyExist});
      } else {
        res
          .status(404)
          .json({ success: wishlistItem.status, message: wishlistItem.message, product: [] });
      }
    } catch (error) {
      handleError(res,error)
    }
  }

  async function RemoveFromWishlist(req, res){
    try {
      const { productId } = req.body;
      const userId = req.session.user._id;
      if (!productId || typeof productId !== 'string') {
        return res.status(400).json({ status: false, message: 'Invalid product id' });
      }
      const wishlistResult = await removeItemFromWishlist(userId, productId);
      if (wishlistResult.status) {
        res
          .status(200)
          .json({ status: wishlistResult.status, message: wishlistResult.message});
      } else {
        res
          .status(404)
          .json({ status: wishlistResult.status, message: wishlistResult.message });
      }
    } catch (error) {
      handleError(res, error);
    }
  }
  
  
  module.exports = {
    GetCart,
    PostToCart,
    RemoveFromCart,
    ClearCart,
    UpdateQuantity,
    GetWishlist,
    PostToWishlist,
    RemoveFromWishlist,
  };
  