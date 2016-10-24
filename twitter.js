'use strict';

// This module retrieve twitter feed and render to the page
module.exports.getTwitterData = function getTwitterData(req, res, oauth) {

	// Access cookie details	
	var access_token = req.cookies.access_token;
	var access_secret = req.cookies.access_token_secret;
	var name  = req.cookies.twitter_id;

	var following = [];
	var tweets = [];
	var dmessages  = [];

	// Create 3 promises for below async work
	// 1. Retrieve user twitter timeline
	// 2. Retrieve user following list 
	// 3. Retrieve user pricate messages
	
	var userTimeLine = new Promise(function(resolve, reject) {
		// Call twitter RESt API to get user timeline
		var url = 'https://api.twitter.com/1.1/statuses/user_timeline.json?count=5';
		oauth.get(url, access_token, access_secret, function(error, data) {

			if(!error) {
				// Parse JSON response
				data = JSON.parse(data);
				tweets = [];

				// Iterate through array and store into tweets array
				data.forEach(function(value, index) {
					// Temporary tweet object to store data
					var obj = {};

					obj.text = value.text;
					obj.name = value.user.name;
					obj.sname = value.user.screen_name;
					obj.image = value.user.profile_image_url;
					obj.rtcount = value.retweet_count;
					obj.favcount = value.favorite_count;

					tweets.push(obj);
				}); // End of forEach
				resolve(tweets);
			} else {
				reject(error);
			}
		}); // End of oauth.get - user timeline
	}); // End of userTimeLine

	var userFriends = new Promise(function(resolve, reject) {

		// Call twitter RESt API to get user friends
		var url = 'https://api.twitter.com/1.1/friends/list.json?count=5';
		oauth.get(url, access_token, access_secret, function(error, data) {

			if (!error) {
				data = JSON.parse(data);

				following = [];
				data.users.forEach(function(value) {
					var obj = {};
					obj.name = value.name;
					obj.sname = value.screen_name;
					obj.image = value.profile_image_url;
					obj.following = value.following;
					following.push(obj);
				}); // End of forEach
				resolve(following);
			} else {
				reject(error);
			}
		}); // End of oauth.get - user friends
	}); // End of userFriends

	var userDMessage = new Promise(function(resolve, reject) {

		// Call twitter RESt API to get user Direct Message 
		// url = 'https://api.twitter.com/1.1/direct_messages/sent.json?count=5';
		var url = 'https://api.twitter.com/1.1/direct_messages.json?count=5';
		oauth.get(url, access_token, access_secret, function(error, data) {

			if (!error) {
				data = JSON.parse(data);

				dmessages = [];
				data.forEach(function(value) {
					var obj = {};
					obj.name = value.sender_screen_name;
					obj.text = value.text;
					obj.image = value.sender.profile_image_url;
					dmessages.push(obj);
				});		
				resolve(dmessages);
			} else {
				reject(error);
			}
		}); // End of oauth.get - user Direct Message
	}); // End of userDMessage

	// Once all promises are resolved render page
	Promise.all([userTimeLine, userFriends, userDMessage]).then(function(data) {
		res.render('index', 
			{name: data[0][0].sname, tweets:data[0], following:data[1], dmessages:data[2]});
	})
	.catch(function(error) {
		res.render('error', {error : 'Oops..Can not get twitter data, something wrong with API Request'})
	})
} // End of getTwitterData
