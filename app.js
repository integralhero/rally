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
  location: {type: String, required: true, unique: true},
  date: {type: Date, required: true, unique: true},
  time: {type: String, required: true, unique: true},
  creator: { type: Schema.Types.ObjectId, ref: 'User' },
  ralliers: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

// User Schema
var userSchema = mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true},
  passwordUH: { type: String, required: true},
  email: {type: String, required: true, unqieu: true},
  imageURL: { type: String},
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
      var friendsIDS = curUser.friends;
      Activity.find({$and: [{creator: {$in: friendsIDS}}, {_id: {$nin: curUser.rallies}}]} , function(err, acts){
        res.render('index', {user: req.user, allActivities: acts});
      });
    });
  } else {
    res.render('index', { user: req.user});
}
});

var nodemailer = require("nodemailer");

var smtpTransport = nodemailer.createTransport("SMTP",{
   service: "Gmail",
   auth: {
       user: "integralhero@gmail.com",
       pass: "P1nk&B1ue"
   }
});

app.get('/search_friend', function(req, res) {
   var regex = new RegExp(req.query["term"], 'i');
   console.log("This is regex...... " + regex);
   User.find({username: regex}).lean().exec(function (err, docs) {
        res.send(JSON.stringify(docs), {
            'Content-Type': 'application/json'
        }, 200);
   });
});

app.post('/emaillookup', function(req, res) {
  var form_data = req.body;
  var email = form_data["email"];
  User.find({email: email}, function(err, result){
    if(result.length == 0) {
      req.session.messages = "Email not found in database!";
    }
    else {
      var userWithEmail = result[0];
      var passwordUser = userWithEmail.passwordUH;
      req.session.messages = "Email has been sent!";
      smtpTransport.sendMail({
         from: "David Jiang <integralhero@gmail.com>", // sender address
         to: userWithEmail.username + " <" + email + ">", // comma separated list of receivers
         subject: "Your Rally Password", // Subject line
         text: "Hello. You have sent a password request. Your password is: " + passwordUser // plaintext body
      });
    }
    res.send(200);
  });
});

var fs = require('fs');
app.post('/file-upload', function(req, res) {
    // get the temporary location of the file
    var tmp_path = req.files.profPic.path;
    // set where the file should actually exists - in this case it is in the "images" directory
    var target_path = './public/images/' + req.files.profPic.name;
    // move the file from the temporary location to the intended location
    User.find({username: req.user.username}, function(err, result) {
      var curUser = result[0];
      var imagePath = "/images/" + req.files.profPic.name;
      curUser.imageURL = imagePath;
      curUser.save();
    });
    fs.rename(tmp_path, target_path, function(err) {
        // delete the temporary file, so that the explicitly set temporary upload dir does not get filled with unwanted files
        fs.unlink(tmp_path, function() {
            if (err) throw err;
            res.redirect('/account');
        });
    });
});

app.get('/account', ensureAuthenticated, function(req, res){
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
        Activity.find({_id: {$in: curUser.rallies}} , function(err, acts){
          res.render('account', { user: req.user, userRallies: activities, joined: acts});
        });
        
      })
    });
  } else {
    res.render('account', { user: req.user});
  }
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user, message: req.session.messages});
});

app.get('/signup', function(req, res){
  res.render('signup', { user: req.user, message: req.session.messages });
});

app.post('/rally', function(req, res) {
  var form_data = req.body;
  var rallyID = form_data["data-id"];
  User.find({username: req.user.username}, function(err, result) {
      var curUser = result[0];
      Activity.find({_id: rallyID}, function(err, act) {
        var activity = act[0];
        curUser.rallies.push(activity._id);
        curUser.save();
        activity.ralliers.push(curUser._id);
        activity.save();
        res.send(200);
      });
  });
});

app.post('/user/new', function(req, res) {
  var form_data = req.body;
  var newUser = new User({
    "username": form_data['username'],
    "password": form_data['password'],
    "passwordUH": form_data['password'],
    "email": form_data['email'],
    "imageURL": "http://placekitten.com/g/200/300"
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

app.get('/friends', function(req, res){
  var me = req.user;
  User.find({username: req.user.username}, function(err, self) {
    var me = self[0];
    //return an array of my friends, rendered to friends.ejs
    var friendsIDS = me.friends;
    User.find({_id: {$in: friendsIDS}}, function(err, friends){
      res.render('friends', {user: req.user, userFriends: friends});
    });
  });
});

app.post('/friend/new', function(req, res){
  var form_data = req.body;
  console.log("flskdjfkljslkdjkfljlksjlkdjfkljlksjlkdjflkjsldkfjllsjdf");
  User.find({username: form_data['username']}, function(err, result) {
    if(err) {console.log(err); res.send(500);}
    if(result.length > 0) {
      var friend = result[0];
      User.find({username: req.user.username}, function(err, self) {
        var selfUser = self[0]; //only push from our side
        selfUser.friends.push(friend._id);
        selfUser.save();
        res.send(200);
      });
    }
    else {
      //user not found
    }
    
  });
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
        "location": form_data['location'],
        "date": form_data['date'],
        "time": form_data['time'],
        "creator": curUser._id
      });
      curUser.rallies.push(newActivity._id);
      curUser.save();
      newActivity.ralliers.push(curUser._id);
      newActivity.save(function(err) {
        if(err) {console.log(err); res.send(500);}
        console.log("Added activity: " + newActivity.title + newActivity.location + newActivity.date + newActivity.time);
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

app.get('/activity/:id', function(req, res) {
  var activityID = req.params.id;
  Activity.find({_id: activityID}, function(err, result){
    var activity = result[0];
    res.render('specificActivity', {user: req.user, activity: activity});
  });
});

app.get('/user/:id', function(req, res) {
  var userID = req.params.id;
  User.find({_id: userID}, function(err, result){
    var friend = result[0];
    res.render('specificFriend', {user: req.user, friend: friend});
  });
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
