var hbs = require('express3-handlebars');
var express = require('express');
var connect = require('connect');
var app = express()
var server = require('http').createServer(app).listen(3000);

var config = require('./config');
var fb = require('fb');
var mongoose = require('mongoose');

require('./models/review')();
var Review = mongoose.model('Review');

mongoose.connect('mongodb://localhost/okcreeper');

fb.options({
    appId: config.appId, 
    appSecret: config.appSecret,
    redirectUri: config.baseUrl+'/login/callback'
});

app.configure(function(){
    app.engine('handlebars', hbs({defaultLayout: 'main'}));
    app.set('view engine', 'handlebars');
    app.use(express.cookieParser());
    app.use(express.session({secret: config.cookieSecret}));
    app.use(connect.urlencoded())
    app.use(connect.json());
    app.use(express.static('public'));
});

function auth(req, res, next){
    if(!req.session.accessToken){
        res.redirect('/');
    }else{
        next();
    }
}

app.get('/', function(req, res){
    if(!req.session.accessToken){
        res.render('blank', {
            loginout: {
                id: 'login',
                text: 'Log in with Facebook',
                uri: fb.getLoginUrl()
            }
        });
    }else{
        res.render('home', {
            loginout: {
                id: 'logout',
                text: 'Log out',
                uri: '/logout'
            }
        });
    }
});

app.get('/search/:username', auth, function(req, res){

    var username = req.params.username;
    response = {
        reviews: []
    };
    Review.find({
        'okcupid_username': username,
        'reviewer_fbid': { $in: req.session.friends }
    }, function(err, reviews){
        response.reviews = reviews;
        Review.findOne({
            'okcupid_username': username,
            'reviewer_fbid': req.session.userId
        }, function(err, myreview){
            response.myreview = (myreview)?myreview.message:"";
            res.send(response);
        });
    });
});

// Add a review (API call)
app.post('/add', auth, function(req, res){

    // Collect data for insertion
    var okcupid_username = req.body.okcupid_username;
    var message = req.body.message;

    // Delete old reviews
    Review.remove({
        reviewer_fbid: parseInt(req.session.userId),
        okcupid_username: okcupid_username
    }).exec();

    if(message !== ''){
        // Add the new review if it exists
        var new_review = new Review({
           reviewer_name: req.session.userName,
           reviewer_fbid: req.session.userId,
           message: message,
           okcupid_username: okcupid_username
        }).save(function(err){
            res.send('ok');    
        });
    }else{
        // Empty review (equivalent to deletion)
        res.send('ok');
    }
});

app.get('/login/callback', function(req, res){

    // Get code
    var code = req.query.code;

    // Handle errors
    if(req.query.error){
        return res.send('login error: '+req.query.error_description);
    }else if(!code){
        return res.redirect('/');
    }

    // Exchange code for access token.
    fb.napi('oauth/access_token', {
        client_id: fb.options('appId'),
        client_secret: fb.options('appSecret'),
        redirect_uri: fb.options('redirectUri'), 
        code: code
    }, function (err, results) {

        // Extend access token
        fb.napi('oauth/access_token', {
            client_id: fb.options('appId'),
            client_secret: fb.options('appSecret'),
            grant_type: 'fb_exchange_token',
            fb_exchange_token: results.access_token
        }, function(err, results){

            // Get the friends and shit!
            if(err) {
                console.log(err);
                return;
            }

            req.session.accessToken = results.access_token;
            req.session.expires = results.expires ? results.expires : 0;
            
            fb.napi('/me', 'get', { access_token: req.session.accessToken }, function(err, results){
                if(err){
                    console.log(err);
                    return;
                }
                req.session.userId = results.id;
                req.session.userName = results.name;
            });

            fb.napi('/me/friends', 'get', { access_token: req.session.accessToken }, function(err, results){
       
                if(err){
                    console.log(err);
                    return;
                }

                req.session.friends = [];
                results.data.forEach(function(friend){
                    req.session.friends.push(friend.id);
                });

                res.redirect('/');

            });

        });

    });

});

app.get('/logout', function (req, res) {
    req.session.destroy();
    res.redirect('/');
});

