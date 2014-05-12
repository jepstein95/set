var connect = require('../database');

exports.index = function(req, res) {
	res.render('index', { title: 'Index' });
}

exports.home = function(req, res) {
	res.render('home', { title: 'Home' });
}

exports.login = function(req, res) {
	res.render('login', { title: 'Login' });
}