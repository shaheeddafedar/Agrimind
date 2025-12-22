const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const i18n = require('i18n');
const cookieParser = require('cookie-parser');
const User = require('./models/User'); 

const pageRouter = require('./routes/pageRouter');
const apiRouter = require('./routes/apiRouter');
const authRouter = require('./routes/auth'); 
const errorController = require('./controllers/errorController');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = 'mongodb+srv://CROPAI:CROPAI123@database.lmlg9ez.mongodb.net/CROPAI?retryWrites=true&w=majority&appName=database';

app.use(cookieParser());

i18n.configure({
    locales: ['en', 'hi', 'kn'], 
    directory: __dirname + '/locales', 
    defaultLocale: 'en',
    cookie: 'lang',
    objectNotation: true 
});
app.use(i18n.init);

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'a_very_strong_secret_key_for_AgriMind',
    resave: false,
    saveUninitialized: false, 
    store: MongoStore.create({ mongoUrl: MONGO_URI }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, 
        httpOnly: true,
        secure: false 
    },
}));

app.use(flash());

app.use(async (req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    try {
        const user = await User.findById(req.session.user._id);
        req.user = user; 
        res.locals.user = user;
        res.locals.isLoggedIn = true;
        next();
    } catch (err) {
        next();
    }
});

app.use((req, res, next) => {
    if (!res.locals.user) {
        res.locals.isLoggedIn = false;
        res.locals.user = null;
    }
    
    const errorMessages = req.flash('error');
    res.locals.errorMessage = errorMessages.length > 0 ? errorMessages[0] : null;
    
    next();
});


app.use(pageRouter);
app.use('/api', apiRouter);
app.use(authRouter);

app.use(errorController.get404);

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("✅ MongoDB Connected Successfully");
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error("❌ Error connecting to MongoDB:", err);
    });
// // Windows:

// // Open terminal (CMD or PowerShell)

// // Run:

// // netstat -ano | findstr :3000


// // You'll get a list like:

// // TCP    127.0.0.1:3000    ...   PID:12345


// // Kill the process:

// // taskkill /PID 12345 /F