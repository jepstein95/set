$(document).ready(function() {

  var hoverSelected;

  $('.form').hover(formIn, formOut);

  function formIn() {
    if ( $(this).hasClass('hidden') && !hoverSelected )
      $('.form').addClass('transition');      
    else
      hoverSelected = true;
  }

  function formOut() {
    if ( $(this).hasClass('hidden') )
      $('.form').removeClass('transition');
    else
      hoverSelected = false;
  }

  $('.form').click(function() {
    if ( $(this).hasClass('hidden') )
      $('.form').toggleClass('hidden');
    $('.form').removeClass('transition');
  });

  $('.create-user').click(function() {
    var username = $('.new-username').val(),
        password = $('.new-password').val();
    $('.new-username').val('');
    $('.new-password').val('');
    submit(username, password, '/create');
  });
  
  $('.login').click(function() {
    var username = $('.username').val(),
        password = $('.password').val();
    $('.username').val('');
    $('.password').val('');
    submit(username, password, '/login');
  });

  function submit(username, password, url) {
    if (username === '' || password === '') {
      $('.message').text('ENTER USERNAME AND PASSWORD');
    } else {
      var dataString = 'username='+ username + '&password=' + password;
      $.ajax({
        type: 'POST',
        url: url,
        data: dataString,
        success: success
      });
    }
  }

  function success(data) {
    if (data.redirect)
      window.location = data.redirect;
    else if (data.message)
      $('.message').text(data.message);
  }
});