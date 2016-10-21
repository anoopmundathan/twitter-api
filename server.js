// 1. Create OAuth object
// 2. Get OAuth token
// 3. Authorize the App
// 4. Get Access Token
// 5. Make a Twitter API request and get data

'use strict';
var express = require('express');
var OAuth = require('oauth').OAuth;
var jade = require('jade');
var cookieParser = require('cookie-parser');
var path = require('path');
var config = require('./config');

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


// View Engine setup
app.set('view engine', 'jade');
app.set('views', path.join(__dirname, 'views'));

app.use(cookieParser());

var followers = [];
var tweets = [];
// Landing page route
app.get('/', function(req, res) {

	// If access token cookie are not available then show login page 
	if (!req.cookies.access_token || !req.cookies.access_token_secret || !req.cookies.twitter_id) {
		res.render('login');
	} else {

		// Render page
		// res.sendFile(__dirname + '/views/' + 'index.html');
		var access_token = req.cookies.access_token;
		var access_secret = req.cookies.access_token_secret;

		// // oauth.get('https://api.twitter.com/1.1/statuses/user_timeline.json',

		var name  = req.cookies.twitter_id;
		
		// oauth.get('https://api.twitter.com/1.1/direct_messages.json',
		oauth.get('https://api.twitter.com/1.1/statuses/user_timeline.json?count=1',
					access_token, access_secret,
					function(error, data) {
						if (error) {
							res.render('login');
						}
						// Parse the JSON response
						data = JSON.parse(data);
						
						data.forEach(function(value, index) {
							var tweet = {};
							tweet.text = value.text;
							tweet.name = value.user.name;
							tweet.sname = value.user.screen_name;
							tweet.image = value.user.profile_image_url;
							tweet.rtcount = value.retweet_count;
    						tweet.favcount = value.favorite_count;
							tweets.push(tweet);
						});

					  getTweets(res, name, tweets);
		}); // get

		oauth.get('https://api.twitter.com/1.1/friends/list.json?count=1', access_token, access_secret, function(error, data) {
			
			if (error) {
				res.render('login');
			}
			
			data = JSON.parse(data);
			data.users.forEach(function(value) {
				var obj = {};
				obj.name = value.name;
				obj.sname = value.screen_name;
				obj.image = value.profile_image_url;
				obj.following = value.following;
				followers.push(obj);
			});
			getFollower(res, followers);
		}); // get
		// res.render('index', {name: name, tweets:tweets});

	} // If 
}); // oauth.get

var getTweets = function (res, name, tweets) {
	res.render('index', {name: name, tweets:tweets, followers:followers});
}

var getFollower = function(res, name, follower) {
	res.render('index', {name: name, tweets:tweets, followers:followers});
}

// Get OAuth token 
app.get('/auth/twitter', function(req, res) {

	// Authorize App to use Twitter API
	oauth.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results) {
			if (error) {
				console.log(error);
				res.send("Authentication failed!");
			} else {
				res.cookie('oauth_token', oauth_token, { httpOnly: true });
				res.cookie('oauth_token_secret', oauth_token_secret, { httpOnly: true });
				res.redirect(config.authorize_url + '?oauth_token='+oauth_token);
			}
		});
});

// Callback URL once Twitter has authorized
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

// Assign port 
app.set('port', process.env.PORT || 3000);

// Listen port
app.listen(app.get('port'), function() {
	console.log('Express started on http://localhost:' + app.get('port') +
		'; press Ctrl-C to terminate');
});