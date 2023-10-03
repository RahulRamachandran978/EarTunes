const express = require('express');
const adminRouter = express.Router();

const upload = require('../config/multer');

const {
  GetDashBoard,
  GetLogin,
  PostLogin,
  GetUsers,
  PutBlockUser,
  GetLogout,
  Get404,
  GetReport,
  GetDisplayReport,
  GetReportExcel,
  GetChartData,
  GetGraphData,
  GetStocksReport,
}= require('../controllers/admin.controller')


const {
  GetProducts,
  GetAddProduct,
  PostAddProduct,
  GetEditProduct,
  PutProduct,
  PutProductDetails,
  GetProductImages,
}= require('../controllers/product.controller')

const{
  GetCategories,
  PostCategories,
  PutCategory,
}= require('../controllers/category.contoller')

const{
  GetOrderPage,
  ChangeOrderStatus,
  GetOrderDetails,
}=require('../controllers/order.controller')

const {
  GetBannerPage,
  AddBanner,
  EditBanner,
}=require('../controllers/banner.controller')

const{
  AddCoupons,
  GetCoupons,
  ChangeCouponStatus,
}=require('../controllers/coupon.controller')

const { isAdminLoggedIn, isAdminLoggedOut, isLoggedIn } = require('../middleware/auth.handler');
const { changeCouponStatus } = require('../models/coupon.model');


adminRouter.get('/',isAdminLoggedIn,GetDashBoard)
adminRouter.get('/login',isAdminLoggedOut,GetLogin);
adminRouter.post('/login',isAdminLoggedOut,PostLogin);
adminRouter.get('/logout',isAdminLoggedIn,GetLogout)

adminRouter.get('/categories',isAdminLoggedIn,GetCategories);
adminRouter.post('/categories',isAdminLoggedIn,PostCategories);
adminRouter.put('/category-status',isAdminLoggedIn,PutCategory);

adminRouter.get('/users',isAdminLoggedIn,GetUsers);
adminRouter.put('/user-status', isAdminLoggedIn,PutBlockUser);

adminRouter.get('/products',isAdminLoggedIn,GetProducts);
adminRouter.get('/add-products',isAdminLoggedIn, GetAddProduct);
adminRouter.post('/add-products',
upload.array('productImage',4),
isAdminLoggedIn,PostAddProduct);

adminRouter.get('/edit-product/:slug',isAdminLoggedIn,GetEditProduct);
adminRouter.get('/getProductImages/:id',isAdminLoggedIn,GetProductImages);
adminRouter.put(
  '/edit-product',
  upload.array('productImage',4),
  isAdminLoggedIn,
  PutProductDetails,
);
adminRouter.put('/product-status/:id',isAdminLoggedIn,PutProduct)

//order management
adminRouter.get('/orders',isAdminLoggedIn,GetOrderPage);
adminRouter.post('/order-status',isAdminLoggedIn,ChangeOrderStatus);
adminRouter.get('/order-details',isAdminLoggedIn,GetOrderDetails);

//Banner management
adminRouter.get('/banners',isAdminLoggedIn,GetBannerPage);
adminRouter.post('/add-banner',upload.single('bannerImage'),isAdminLoggedIn,AddBanner);
adminRouter.post('/edit-banner',upload.single('bannerImage'),isAdminLoggedIn,EditBanner);

//coupon management
adminRouter.get('/coupons', isAdminLoggedIn, GetCoupons);
adminRouter.post('/coupons', isAdminLoggedIn, AddCoupons);
adminRouter.put('/coupon-status', isAdminLoggedIn, ChangeCouponStatus);

//Dashboard
adminRouter.get('/graph',isAdminLoggedIn,GetGraphData);
adminRouter.get('/chart',isAdminLoggedIn,GetChartData);
adminRouter.get('/sales-report',isAdminLoggedIn,GetDisplayReport);
adminRouter.get('/sales-report/download',isAdminLoggedIn,GetReport)
adminRouter.get('/sales-report/download-excel',isAdminLoggedIn,GetReportExcel);
adminRouter.get('/stocks-report',isAdminLoggedIn,GetStocksReport);
 

adminRouter.get('*', Get404);


module.exports = adminRouter;