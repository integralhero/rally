var express = require('express')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , mongodb = require('mongodb')
  , mongoose = require('mongoose')
  , bcrypt = require('bcrypt')
  , http = require('http')
  , SALT_WORK_FACTOR = 10;
  

var local_database_name = 'rallynow';
var local_database_uri  = 'mongodb://localhost/' + local_database_name
var database_uri = process.env.MONGOLAB_URI || local_database_uri
mongoose.connect(database_uri);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
  console.log('Connected to DB');
});
var Schema = mongoose.Schema;
mongoose.set('debug', true);
//Activity Schema
var activitySchema = mongoose.Schema({
  title: { type: String, required: true, unique: true },
  creator: { type: Schema.Types.ObjectId, ref: 'User' },
  ralliers: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

// User Schema
var userSchema = mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true},
  friends : [{ type: Schema.Types.ObjectId, ref: 'User' }],
  rallies: [{type: Schema.Types.ObjectId, ref: 'Activity'}]
});

// Password verification
userSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if(err) return cb(err);
    cb(null, isMatch);
  });
};

// Bcrypt middleware
userSchema.pre('save', function(next) {
	var user = this;

	if(!user.isModified('password')) return next();

	bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
		if(err) return next(err);

		bcrypt.hash(user.password, salt, function(err, hash) {
			if(err) return next(err);
			user.password = hash;
			next();
		});
	});
});


var User = mongoose.model('User', userSchema);
var Activity = mongoose.model('Activity', activitySchema);
// Seed a user
/*
var user = new User({ username: 'bob',  password: 'secret' });
user.save(function(err) {
  if(err) {
    console.log(err);
  } else {
    console.log('user: ' + user.username + " saved.");
  }
});
*/

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});


// Use the LocalStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a username and password), and invoke a callback
//   with a user object.  In the real world, this would query a database;
//   however, in this example we are using a baked-in set of users.
passport.use(new LocalStrategy(function(username, password, done) {
  User.findOne({ username: username }, function(err, user) {
    if (err) { return done(err); }
    if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
    user.comparePassword(password, function(err, isMatch) {
      if (err) return done(err);
      if(isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Invalid password' });
      }
    });
  });
}));


var app = express();

// configure Express
app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('port', process.env.PORT || 3000);
  app.set('view engine', 'ejs');
  app.engine('ejs', require('ejs-locals'));
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'keyboard cat' }));
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});


app.get('/', function(req, res){
  if(req.isAuthenticated()) {
    User.find({username: req.user.username}, function(err, result) {
      if(err) {console.log(err); res.send(500);}
      var curUser = result[0];
      console.log("Retrieving user for index: " + curUser.username + ". He/she has " + curUser.rallies.length + "activities");
      //console.log("Number of rallies: " + curUser.rallies.length);
      console.log("ActivityC: " + curUser.rallies[0]);
      var query = Activity.find({creator: curUser._id});
      query.exec(function (err, activities) {
        //console.log(activity.title);
        res.render('index', { user: req.user, userRallies: activities});
      })
    });
  } else {
    res.render('index', { user: req.user});
  }
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user, message: req.session.messages });
});

app.get('/signup', function(req, res){
  res.render('signup', { user: req.user, message: req.session.messages });
});

app.post('/user/new', function(req, res) {
  var form_data = req.body;
  var newUser = new User({
    "username": form_data['username'],
    "password": form_data['password']
  });
  newUser.save(afterSave);
  console.log("Added!: "+ form_data);
  function afterSave(err) {
    if(err) {console.log(err); res.send(500);}
    res.send(200);
  }
  // make a new Project and save it to the DB
  // YOU MUST send an OK response w/ res.send();
});

app.post('/activity/new', function(req, res) {
  var form_data = req.body;
  //assign this activity to user as well
  User.find({username: req.user.username}, function(err, result) {
    if(err) {console.log(err); res.send(500);}
    var curUser = result[0];
    console.log("Found current user " + curUser.username+ "---------");
    curUser.save(function(err){
      if(err) {console.log(err); res.send(500);}
      var newActivity = new Activity({
        "title": form_data['title'],
        "creator": req.user._id
      });
      curUser.rallies.push(newActivity._id);
      curUser.save();
      newActivity.save(function(err) {
        if(err) {console.log(err); res.send(500);}
        console.log("Added activity: " + newActivity.title);
        console.log("Yay, saved new activity and added to " + curUser.username);
        res.send(200);
      });

    });
    
  });

});

// POST /login
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
//
//   curl -v -d "username=bob&password=secret" http://127.0.0.1:3000/login
//   
/***** This version has a problem with flash messages
app.post('/login', 
  passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
  function(req, res) {
    res.redirect('/');
  });
*/
  
// POST /login
//   This is an alternative implementation that uses a custom callback to
//   acheive the same functionality.
app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) { return next(err) }
    if (!user) {
      req.session.messages =  [info.message];
      return res.redirect('/login')
    }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      return res.redirect('/');
    });
  })(req, res, next);
});

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

//app.listen(process.env.PORT || 3000);
/*
app.listen(3000, function() {
  console.log('Express server listening on port 3000');
});
*/
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}
