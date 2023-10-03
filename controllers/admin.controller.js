const { handleError } = require('../middleware/error.handler');


const {
  fetchAllUsers,
  findUserWithId,
  getDashBoardData,
  getChartData,
  getGraphData,
} = require('../models/admin.model');

const {getProductStocks} = require('../models/product.model');
const{generateSalesReport,generateStocksReport} = require('../config/pdfKit');
const{getOrderData,getOrders}=require('../models/order.model');
const{generateSalesReportExcel} = require('../config/excel');

// const { generateSalesReport } = require('../config/pdfKit');
// const { getOrderData } = require('../models/order.model');

async function GetDashBoard(req, res) {
  try {
    const result = await getDashBoardData();
    const orders = await getOrderData()
    res.render('admin/dashboard', {
      totalRevenue: result.totalRevenue,
      totalOrdersCount: result.totalOrdersCount,
      totalProductsCount: result.totalProductsCount,
      totalCategoriesCount: result.totalCategoriesCount,
      currentMonthEarnings: result.currentMonthEarnings,
      orders: orders,
      activePage: 'dashboard'
    });
  } catch (error) {
    handleError(res, error);
  }
}

async function GetLogin(req, res) {
  try {
    res.render('admin/login');
  } catch (error) {
    handleError(res, error);
  }
}

async function PostLogin(req, res) {
  try {
    console.log(req.body.email,req.body.password);
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      if (
        req.body.email === process.env.ADMIN_EMAIL &&
        req.body.password === process.env.ADMIN_PASSWORD
      ) {
        req.session.adminLoggedIn = true;
        
        return res.status(200).json({ status: true });
      } else {
        return res.status(400).json({ status:false, error: 'Email or password is incorrect.' });
      }
    } else {
      return res.status(400).json({ error: 'Admin credentials are not set.' });
    }
  } catch (error) {
    handleError(res, error);
  }
}


async function GetUsers(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const response = await fetchAllUsers(page, limit);
    if (response.status) {
      res.render('admin/users', {
        users: response.users,
        totalPages: response.totalPages,
        currentPage: response.currentPage,
        limit: response.limit,
        activePage:'users'
      });
    } else {
      throw new Error('Failed to fetch users');
    }
  } catch (error) {
    handleError(res, error);
  }
}


async function PutBlockUser(req, res) {
  const { id, action } = req.body;
  try {
    const user = await findUserWithId(id, action);
    if (!user.status) {
      return res.send({ status: 404, message: 'User not found' });
    } else {
      return res.send({
        status: 200,
        message: `User status updated.User ${action}ed succesfully.`,
      });
    }
  } catch (error) {
    handleError(res, error);
  }
}


async function GetLogout(req, res) {
  try {
    req.session.destroy();
    res.redirect('/admin/login');
  } catch (error) {
    handleError(res, error);
  }
}

async function Get404(req, res) {
  try {
    res.render('admin/404');
  } catch (error) {
    handleError(res, error);
  }
};

async function GetGraphData(req, res) {
  try {
    const result = await getGraphData();
    if (result.status) {
      res.json({
        labels: result.labels,
        sales: result.salesData,
        products: result.productsData,
        message: result.message,
        success: true,
      });
    } else {
      res.json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async function GetChartData(req, res) {
  try {
    const result = await getChartData();
    if (result.status) {
      const { popularProducts } = result;

      // Populate the chart data
      const labels = popularProducts.map((product) => product.productName);
      const data = popularProducts.map((product) => product.totalOrders);
      const stocks = popularProducts.map((product) => product.stocks); // Fetch product stock data

      return res.json({
        success: true,
        labels,
        data,
        stocks,
      });
    } else {
      return res.json({
        success: false,
        message: 'Oops! Something went wrong. Chart data not found.',
      });
    }
  } catch (error) {
    handleError(res, error);
  }
}

async function GetDisplayReport(req, res) {
  try {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const reportData = await getOrders(startDate, endDate);
    return res.status(200).json(reportData)
  } catch (error) {
    handleError(res, error)
  }
}

async function GetReport(req, res) {
  try {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    let reportData;
    if (startDate == 'null' && endDate === 'null') {
      reportData = await getOrderData();
      generateSalesReport(reportData, res);
    } else {
      reportData = await getOrders(startDate, endDate);
      generateSalesReport(reportData, res);
    }
  } catch (error) {
    handleError(res, error);
  }
}

async function GetReportExcel(req, res) {
  try {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    let reportData;
    if (startDate === 'null' && endDate === 'null') {
      reportData = await getOrderData();
    } else {
      reportData = await getOrders(startDate, endDate);
    }
    const workbook = await generateSalesReportExcel(reportData);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    handleError(res, error);
  }
};

async function GetStocksReport(req, res) {
  try {
    const stockReport = await getProductStocks();
    if (!stockReport) {
      return res.status(400).json({ message: 'Unable to fetch stock details!' })
    }
    generateStocksReport(stockReport, res);
  } catch (error) {
    handleError(res, error)
  }
}


module.exports = {
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
};
