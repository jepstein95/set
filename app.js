var express = require('express'),
    http = require('http'),
    passwordHash = require('password-hash'),
    sanitizer = require('sanitizer'),
    _ = require('underscore'),
    path = require('path'),
    routes = require('./routes'),
    database = require('./lib/database');

var EXPRESS_SID_KEY = 'express.sid',
    COOKIE_SECRET = 'mel is bad at set.',
    bodyParser = express.bodyParser(),
    cookieParser = express.cookieParser(COOKIE_SECRET),
    sessionStore = new express.session.MemoryStore(),
    session = express.session({
      store: sessionStore,
      cookie: {
        httpOnly: true
      },
      key: EXPRESS_SID_KEY
    });

var app = express();

app.use(bodyParser);
app.use(cookieParser);
app.use(session);
app.use(app.router);

// view engine setup
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var users = []; //FIXME

// DEVELOPMENT
var added = 0;
var logins = ["josh", "j.epstein", "babou", "jorge", "jose guillermo", "beaver", "yourmom", "nadie"];

// TODO: HANDLE CASE WHERE USER HAS MULTIPLE TABS OPEN
function restrict(req, res, next) {
  
  // DEVELOPMENT
  req.session.user = logins[added];
  added++;
  
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
}

app.get('/', routes.index);

app.get('/login', routes.login);

app.get('/main', restrict, routes.main);

app.get('/logout', function(req, res) {
  if (req.session.user) {
    var index = users.indexOf(req.session.user); // indexOf --> NO IE
    users.splice(index, 1);
    delete req.session.user;
  }
  res.redirect('/login')
});

app.post('/create', function(req, res) {
  var username = req.body.username,
      password = req.body.username;

  var hashedPassword = passwordHash.generate(password);
  database.query('SELECT * FROM users where username=?;', [username], function(err, rows, fields) {
    if(rows[0] == null) {
      database.query('INSERT INTO users (username, password) values (?, ?);', [username, hashedPassword], function(err, result) {
        users.push(username);
        req.session.user = username;
        res.send({ redirect: '/main' });
      });
    } else {
      res.send({ message: 'USERNAME ALREADY TAKEN' });
    }
  });
});

app.post('/login', function(req, res) {
  var username = req.body.username,
      password = req.body.password;

  if (_.contains(users, username)) {
    res.send({ message: 'USER ALREADY LOGGED IN' });
  } else {
    database.query('SELECT * FROM users where username=?;', [username], function(err, rows, fields) {
      if (rows[0] != null) {
        hashedPassword = rows[0].password;
        var success = passwordHash.verify(password, hashedPassword);
        if(success) {
          req.session.user = username;
          users.push(username);
          res.send({ redirect: '/main' });
        } else {
          res.send({ message: 'PASSWORD INCORRECT' });
        }
      } else {
        res.send({ message: 'INCORRECT USERNAME' });
      }
    });
  }
});

var server = http.createServer(app);
var io = require('socket.io', { rememberTransport: false, transports: ['WebSocket', 'Flash Socket', 'AJAX long-polling'] }).listen(server);

io.set('authorization', function (data, callback) {
    if(!data.headers.cookie) {
        return callback('No cookie transmitted.', false);
    }

    // We use the Express cookieParser created before to parse the cookie
    // Express cookieParser(req, res, next) is used initialy to parse data in "req.headers.cookie".
    // Here our cookies are stored in "data.headers.cookie", so we just pass "data" to the first argument of function
    cookieParser(data, {}, function(parseErr) {
        if(parseErr) { return callback('Error parsing cookies.', false); }

        // Get the SID cookie
        var sidCookie = (data.secureCookies && data.secureCookies[EXPRESS_SID_KEY]) ||
                        (data.signedCookies && data.signedCookies[EXPRESS_SID_KEY]) ||
                        (data.cookies && data.cookies[EXPRESS_SID_KEY]);

        // Then we just need to load the session from the Express Session Store
        sessionStore.load(sidCookie, function(err, session) {
            // And last, we check if the used has a valid session and if he is logged in
            if (err || !session || !session.user) {
                callback('Not logged in.', false);
            } else {
                // If you want, you can attach the session to the handshake data, so you can use it again later
                // You can access it later with "socket.handshake.session"
                data.session = session;

                callback(null, true);
            }
        });
    });
});

// socket logic
require('./lib/socket')(io);
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});