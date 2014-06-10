var socket = io.connect();

$(document).ready(function() {
	$("#createUser").click(function() {
		var username = $("#newUsername").val();
		var password = $("#newPassword").val();
		$("#newUsername").val("");
		$("#newUsername").val("")
		socket.emit("create-user", {username: username, password: password});
	});
	
	$("#login").click(function() {
		var username = $("#username").val();
		var password = $("#password").val();
		$("#username").val("");
		$("#password").val("")
		socket.emit("login-user", {username: username, password: password});
	});
	
	socket.on("login-response", function(content) {
		alert(content.message + " " + content.bool);
	});
});