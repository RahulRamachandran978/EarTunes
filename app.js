require('dotenv').config();

const{catergoryMiddleware,loggedInMiddeleware,cartProducts} = require('./middleware/custom.middleware')


const path = require('path');
const express = require('express');
const session = require('express-session')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const  {mongoconnect} = require('./config/mongo')
const cors = require('cors')
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');


const app = express();
const ip = '127.0.0.1'
const PORT = process.env.PORT ||5000;


//routes
const adminRouter = require('./routes/admin.router');
const userRouter = require('./routes/user.router');




//global middlewares
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(mongoSanitize());
app.use(xss())

app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('short'));
app.use(cors())
app.use(cookieParser());
app.use(
  session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:false,
    cookie :{
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  })
);


//custom middlewares
app.use(catergoryMiddleware);
app.use(loggedInMiddeleware);
app.use(cartProducts);


// view engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


//router middlewares
app.use('/admin', adminRouter);
app.use('/', userRouter);


console.clear();

async function startServer(){
  await mongoconnect();
  app.listen(PORT,()=>{
    console.log(`Listening on http://localhost:${PORT}🚀`);
  });
}

  startServer();
