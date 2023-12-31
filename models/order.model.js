const crypto = require('crypto');

const addressDatabase = require('../schema/address.schema');
const orderDatabase = require('../schema/order.schema');
const cartDatabase = require('../schema/cart.schema');
const userDatabase = require('../schema/user.schema');
const productDatabase = require('../schema/product.schema');
const { addressSchema } = require('../config/joi');
const { handleError } = require('../middleware/error.handler');

async function getAddresses(userId, res) {
  try {
    const addresses = await addressDatabase.find({ user: userId });
    if (!addresses) {
      return { status: false };
    } else {
      return { status: true, addresses: addresses };
    }
  } catch (error) {
    handleError(res, error);
  }
}

async function addAddress(addressData, userId, res) {
  try {
    const validation = addressSchema.validate(addressData, {
      abortEarly: false,
    });

    if (validation.error) {
      return { status: false, message: validation.error.details[0].message };
    }

    // Validate input
    if (!addressData || !userId) {
      throw new Error('Missing required input');
    }
    const address = new addressDatabase({
      fname: addressData.fname,
      lname: addressData.lname,
      street_address: addressData.street_address,
      city: addressData.city,
      state: addressData.state,
      zipcode: addressData.zipcode,
      country: addressData.country,
      phone: addressData.phone,
      email: addressData.email,
      user: userId,
      isShippingAddress: true,
    });

    const addressResult = await address.save();
    if (addressResult) {
      return { status: true, message: 'address added to the database' };
    } else {
      return { status: false, message: 'something wrong! address not added' };
    }
  } catch (error) {
    handleError(res, error);
  }
}

async function deleteAddress(addressId) {
  try {
    const result = await addressDatabase.findByIdAndDelete(addressId);
    if (result) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log(error);
  }
}

async function addOrderDetails(addressId, paymentMethod, userId, req, res) {
  try {
    if (!['razorpay', 'cashOnDelivery'].includes(paymentMethod)) {
      throw new Error('Invalid payment method');
    }
    //fetching the cart items and total
    const cartResult = await cartDatabase.findOne({ user: userId }).select('items total');

    if (cartResult) {
      //crate transaction id
      const transactionId = crypto
        .createHash('sha256')
        .update(`${Date.now()}-${Math.floor(Math.random() * 12939)}`)
        .digest('hex')
        .substr(0, 16);

      const orderStatus = paymentMethod === 'cashOnDelivery' ? 'processing' : 'pending';
      const order = new orderDatabase({
        user: userId,
        items: cartResult.items,
        shippingAddress: addressId,
        paymentmethod: paymentMethod,
        transactionId: transactionId,
        status: orderStatus,
        total: cartResult.total,
      });

      if (req.session.coupon) {
        let coupon = req.session.coupon;
        const discountAmount = (coupon.discount / 100) * cartResult.total;
        order.discount = discountAmount;
        order.total = cartResult.total - discountAmount.toFixed(2);
      }

      if (req.session.appliedWallet) {
        let appliedWallet = req.session.appliedWallet;
        order.total = order.total - appliedWallet;
      }

      for (const item of cartResult.items) {
        const quantity = item.quantity;
        await productDatabase.findByIdAndUpdate(
          item.product,
          { $inc: { stocks: -quantity } },
          { new: true },
        );
      }
      await order.save();
      await cartDatabase.deleteOne({ user: userId });
      return { status: true, order: order ,cartResult };
    } else {
      return { status: false };
    }
  } catch (error) {
    handleError(res, error);
  }
}

async function  verifyPayment(razorData, res) {
  try {
    var expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    expectedSignature.update(
      razorData['payment[razorpay_order_id]'] + '|' + razorData['payment[razorpay_payment_id]'],
    );

    expectedSignature = expectedSignature.digest('hex');

    if (expectedSignature === razorData['payment[razorpay_signature]']) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    handleError(res, error);
  }
}

async function changePaymentStatus(orderId, paymentDetails, res) {
  try {
    const changePaymentStatus = await orderDatabase.updateOne(
      { _id: orderId },
      {
        $set: {
          status: 'processing',
          paymentResponse: paymentDetails,
        },
      },
    );

    if (changePaymentStatus.modifiedCount > 0) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    handleError(res, error);
  }
}

async function setSuccessStatus(orderId) {
  try {
    const result = await orderDatabase.updateOne(
      { _id: orderId },
      {
        $set: {
          paymentStatus: 'success',
        },
      },
    );

    if (result) {
      return true;
    }
  } catch (error) {
    throw new Error('failed to change payment status!something wrong');
  }
}

async function fetchUserOrderDetails(userId, res, page, limit) {
  try {
    const orders = await orderDatabase
      .find({ user: userId })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('total status transactionId date items paymentStatus orderNumber')
      .sort({ date: -1 });

    const totalOrder = await orderDatabase.countDocuments();
    const totalPages = Math.ceil(totalOrder / limit);

    const addresses = await addressDatabase.find({ user: userId });

    const orderDetails = orders.map((order) => {
      // Calculate the return date
      const returnDate = new Date(order.date);
      returnDate.setDate(returnDate.getDate() + 7);

      return {
        productCount: order.items.length,
        date: order.date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }),
        returnDate: returnDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }),
        transactionId: order.transactionId,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        id: order._id,
        orderNumber:order.orderNumber
      };
    });

    return {
      orderDetails: orderDetails,
      addresses: addresses,
      totalPages: totalPages,
      currentPage: page,
      limit: limit,
    };
  } catch (error) {
    handleError(res, error);
  }
}

async function cancelOrder(orderId, cancelReason) {
  try {
    const result = await orderDatabase.updateOne(
      { _id: orderId },
      {
        $set: {
          status: 'cancelPending',
          cancel_reason: cancelReason,
        },
      },
    );
    return result.modifiedCount === 1;
  } catch (error) {
    console.log(error);
  }
}
async function returnOrder(orderId, returnreason) {
  try {
    const result = await orderDatabase.updateOne(
      { _id: orderId },
      {
        $set: {
          status: 'returnPending',
          return_reason: returnreason,
        },
      },
    );
    
    return result?.modifiedCount === 1;
  } catch (error) {
    console.log(error);
  }
}

async function getAllOrders(page,limit) {
  try {
    const orders = await orderDatabase
      .find()
      .sort({ date: -1 }) // Sort by date in descending order
      .populate('user','username')
      .skip((page - 1) * limit)
      .limit(limit);
    const totalOrders = await orderDatabase.countDocuments();
    const totalPages = Math.ceil(totalOrders / limit);

    if (!orders || orders.length === 0) {
      return {
        status: false,
        limit: limit,
        orders: [],
        totalPages: totalPages,
        currentPage: page,
        message: 'Orders not found',
      };
    }

    return {
      status: true,
      limit: limit,
      orders: orders,
      totalPages: totalPages,
      currentPage: page,
      message: 'Orders found successfully',
    };
  } catch (error) {
    console.log(error);
    throw new Error('Failed to fetch orders from database');
  }
}

async function changeOrderStatus(changeStatus,orderId) {
  try {
    if (!['shipped', 'delivered', 'canceled', 'returned'].includes(changeStatus)) {
      throw new Error('Invalid status');
    }

    const orderResult = await orderDatabase.findByIdAndUpdate(orderId, {
      $set: {
        status: changeStatus,
      },
    });

    if (changeStatus === 'returned') {
      const orderResult = await orderDatabase.findById(orderId).select('total user');
      const { total, user } = orderResult;
      const userResult = await userDatabase.findById(user).select('wallet');
      const wallet = userResult.wallet;
      const updatedWallet = wallet + total;
      await userDatabase.findByIdAndUpdate(user, {
        $set: {
          wallet: updatedWallet,
        },
      });
    }
    if(changeStatus === 'returned' || changeStatus  === 'canceled'){
      await updateProductStocks(orderId, changeStatus);
    }

    if (orderResult) {
      return { status: true, message: 'order updated' };
    } else {
      return { status: false, message: 'something goes wrong updation failed' };
    }
  } catch (error) {
    console.log(error)
    throw new Error('failed to change status!something wrong');
  }
}


async function updateProductStocks(orderId, changeStatus) {
  try {
    const order = await orderDatabase.findById(orderId).populate('items.product');
    if (!order) {
      throw new Error('Order not found');
    }
    if (changeStatus === 'returned' || changeStatus === 'canceled') {
      for (const item of order.items) {
        const productId = item.product._id;
        const returnedQuantity = item.quantity;
        const product = await productDatabase.findById(productId);

        if (!product) {
          throw new Error('Product not found');
        }
        product.stocks += returnedQuantity;
        await product.save();

      }
    }
  } catch (error) {
    throw new Error(`Failed to update product stocks: ${error.message}`);
  }
}

async function getOrderData() {
  try {
    const orders = await orderDatabase
      .find({ status: 'delivered' })
      .populate({
        path: 'items.product',
        model: 'Product',
      })
      .populate('shippingAddress')
      .populate('user');

    const reportData = [];

    for (const order of orders) {
      for (const item of order.items) {
        const { product, quantity, price } = item;

        const entry = {
          date: order.date,
          product: product.productName,
          quantity,
          price,
        };

        reportData.push(entry);
      }
    }
    return reportData;
  } catch (error) {
    throw new Error('Oops! Something went wrong while fetching order data');
  }
}

async function getWallet(userId) {
  try {
    const amount = await userDatabase.findById(userId).select('wallet');
    const pendingOrders = await orderDatabase
      .find({
        user: userId,
        status: 'returnPending',
      })
      .select('total');
      


    let pendingAmount = 0;

    for (const order of pendingOrders) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      pendingAmount += order.total;
    }

    console.log(pendingAmount);
    console.log(pendingOrders);

    if (amount) {
      return { status: true, amount: amount.wallet, pendingWallet: pendingAmount };
    } else {
      return { status: false, amount: 0, pendingWallet: pendingAmount };
    }
  } catch (error) {
    throw new Error('Oops! Something went wrong while fetching wallet');
  }
}

async function getUserData(userId) {
  try {
    const amount = await userDatabase.findById(userId).select('wallet');
    if (amount) {
      return { status: true, amount: amount.wallet };
    } else {
      return { status: false, amount: 0 };
    }
  } catch (error) {
    throw new Error('Error finding user!');
  }
}

async function getOrderdetails(orderId) {
  try {
    const orderData = await orderDatabase
      .findById(orderId)
      .populate({
        path: 'items.product',
        select: 'productName productPrice productImageUrls slug',
        model: 'Product',
      })
      .populate({
        path: 'user',
        select: 'username email',
        model: 'User',
      })
      .populate('shippingAddress');

    const subtotal = orderData.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    orderData.subtotal = subtotal;

    if (orderData) {
      return { status: true, orderData };
    } else {
      return { status: false };
    }
  } catch (error) {
    throw new Error('Error finding order!');
  }
}
async function updateWalletData(walletAmount, userId, orderId) {
  try {
    const user = await userDatabase.findByIdAndUpdate(
      userId,
      {
        $inc: { wallet: -walletAmount },
      },
      { new: true },
    );
    const result = await orderDatabase.findByIdAndUpdate(
      orderId,
      {
        $set: { wallet: walletAmount },
      },
      { new: true },
    );
    return;
  } catch (error) {
    console.error('Error updating wallet data:', error);
    throw new Error('Error updating wallet data!');
  }
}

async function getOrders(startDate, endDate) {
  let query = { status: 'delivered' };
  if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate };  
  }

  const orders = await orderDatabase
    .find(query)
    .populate({
      path: 'items.product',
      model: 'Product',
    })
    .populate('shippingAddress')
    .populate('user');

  const reportData = [];

  for (const order of orders) {
    for (const item of order.items) {
      const { product, quantity, price } = item;
      // Format the date
      const formattedDate = new Date(order.date).toLocaleDateString('en-US');
      const entry = {
        date: formattedDate,
        product: product.productName,
        quantity,
        price,
      };

      reportData.push(entry);
    }
  }
  return reportData;
}

async function orderStatus(orderId){
  try {
    const result = await orderDatabase.findByIdAndUpdate(
      orderId,
      {
        $set: { paymentmethod: 'COD',status:'processing' },
      },
      { new: true },
    );
    return true;
  } catch (error) {
    throw new Error('Error updating order  data!');
    
  }
};

async function hasPurchased(userId, productId){
  try {
    const purchaseResult = await orderDatabase.find({ user: userId, 'items.product': productId })
    if(purchaseResult.length>0){
    return {status: true, purchaseResult }
    }else{
      return {status:false}
    }
  } catch (error) {
    throw new Error("Error finding the product!")
  }
}

module.exports = {
  addOrderDetails,
  getAddresses,
  addAddress,
  verifyPayment,
  changePaymentStatus,
  fetchUserOrderDetails,
  cancelOrder,
  returnOrder,
  deleteAddress,
  getAllOrders,
  changeOrderStatus,
  getOrderData,
  setSuccessStatus,
  getWallet,
  getUserData,
  getOrderdetails,
  updateWalletData,
  orderStatus,
  getOrders,
  hasPurchased,
};
