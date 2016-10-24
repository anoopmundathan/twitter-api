'use strict';

var express = require('express');
var OAuth = require('oauth').OAuth;
var jade = require('jade');
var cookieParser = require('cookie-parser');
var path = require('path');
var config = require('./config');
var bodyParser = require('body-parser');
var twitter = require('./twitter');
var url = require('url');

// Create the oauth object for accessing Twitter
var oauth = new OAuth(
	config.request_token_url,
	config.access_token_url,
	config.consumer_key,
	config.consumer_secret,
	config.oauth_version,
	config.oauth_callback,
	config.oauth_signature
);

var app = express();

// Serve static file
app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// View Engine setup
app.set('view engine', 'jade');
app.set('views', path.join(__dirname, 'views'));

app.use(cookieParser());

// 1. Landing page route
app.get('/', function(req, res) {

	// If access token cookies are not available then show login page 
	if (!req.cookies.access_token || !req.cookies.access_token_secret || !req.cookies.twitter_id) {
		res.render('login');
	} else {
		twitter.getTwitterData(req, res, oauth);
	} // If 
}); // oauth.get

// 2. When user Click to Login - This route will receive the request
app.get('/auth/twitter', function(req, res) {

	// Authorize App to use Twitter API
	oauth.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results) {
			if (error) {
				res.send("Authentication failed!");
			} else {
				res.cookie('oauth_token', oauth_token, { httpOnly: true });
				res.cookie('oauth_token_secret', oauth_token_secret, { httpOnly: true });
				res.redirect(config.authorize_url + '?oauth_token='+oauth_token);
			}
		});
});

// 3. Callback URL once Twitter has authorized
app.get(url.parse(config.oauth_callback).path, function(req, res) {

	// Clear the request token data from the cookies
	res.clearCookie('oauth_token');
	res.clearCookie('oauth_token_secret');

	oauth.getOAuthAccessToken(req.cookies.oauth_token, req.cookies.oauth_token_secret, req.query.oauth_verifier,
			function(error, oauth_access_token, oauth_access_token_secret, results) {
				if (error) {
					res.render('login');
				}
				
				// Get the user's Twitter ID
				oauth.get('https://api.twitter.com/1.1/account/verify_credentials.json',
					oauth_access_token, oauth_access_token_secret,
					function(error, data) {
						if (error) {
							res.render('login');
						}

						// Parse the JSON response
						data = JSON.parse(data);

						// Store the access token, access token secret, and user's Twitter ID in cookies
						res.cookie('access_token', oauth_access_token, { httpOnly: true });
						res.cookie('access_token_secret', oauth_access_token_secret, { httpOnly: true });
						res.cookie('twitter_id', data.id_str, { httpOnly: true });

						// Tell router that authentication was successful
						res.redirect('/');
				});
	});
});

// 4. Post new Tweet
app.post('/post', function(req, res) {
	
	var url = 'https://api.twitter.com/1.1/statuses/update.json';
	var access_token = req.cookies.access_token;
	var access_secret = req.cookies.access_token_secret;

	var body = {
		'status' : req.body.new_tweet 
	}

	oauth.post(url, access_token, access_secret, body, "application/x-www-form-urlencoded", function (error, body, response) {
        if(!error) {
        	console.log('Twitter status updated.\n');
        	res.redirect('/');
        } else {
        	console.log('Error: Something is wrong.\n'+JSON.stringify(error)+'\n');
        	res.render('error', {error: error});
        }
    }); // ouath.post
}); // app.post

// 5. Sign out
app.get('/signout', function(req, res) {
	res.redirect('/auth/twitter');
}); //app.get - signout

// Assign port 
app.set('port', process.env.PORT || 3000);

// Listen port
app.listen(app.get('port'), function() {
	console.log('Express started on http://localhost:' + app.get('port') +
		'; press Ctrl-C to terminate');
});