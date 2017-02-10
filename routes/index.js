'use strict';

var express = require('express');
var url = require('url');
var config = require('../config');
var twitter = require('../twitter');
var router = express.Router();
var OAuth = require('oauth').OAuth;

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

// 1. Landing page route
router.get('/', function(req, res) {

	// If access token cookies are not available then show login page 
	if (!req.cookies.access_token || !req.cookies.access_token_secret || !req.cookies.twitter_id) {
		res.render('login');
	} else {
		twitter.getTwitterData(req, res, oauth);
	} // If 
}); // oauth.get

// 2. When user Click to Login - This route will receive the request
router.get('/auth/twitter', function(req, res) {

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
router.get(url.parse(config.oauth_callback).path, function(req, res) {

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
router.post('/post', function(req, res) {
	
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
router.get('/signout', function(req, res) {
	res.redirect('/auth/twitter');
}); //app.get - signout

module.exports = router;