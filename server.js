'use strict';

var express = require('express');
var jade = require('jade');
var cookieParser = require('cookie-parser');
var path = require('path');
var bodyParser = require('body-parser');
var router = require('./routes/index');



var app = express();

// Serve static file
app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// View Engine setup
app.set('view engine', 'jade');
app.set('views', path.join(__dirname, 'views'));

app.use(cookieParser());

app.use('/', router);

// Assign port 
app.set('port', process.env.PORT || 3000);

// Listen port
app.listen(app.get('port'), function() {
	console.log('Express started on http://localhost:' + app.get('port') +
		'; press Ctrl-C to terminate');
});