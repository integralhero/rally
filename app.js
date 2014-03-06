var express = require('express')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , mongodb = require('mongodb')
  , mongoose = require('mongoose')
  , bcrypt = require('bcrypt')
  , http = require('http')
  , SALT_WORK_FACTOR = 10;

var cloudinary = require('cloudinary');
var flash = require('connect-flash');
var local_database_name = 'rallynow';
var local_database_uri  = 'mongodb://localhost/' + local_database_name
var database_uri = process.env.MONGOLAB_URI || local_database_uri
mongoose.connect(database_uri);

cloudinary.config({ 
  cloud_name: 'dqoghmerz', 
  api_key: '584839643982217', 
  api_secret: 'vLp3SltT9L9TkQGbhiZwNUOytAw' 
});

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
  console.log('Connected to DB');
});
var Schema = mongoose.Schema;
mongoose.set('debug', true);
//Activity Schema
var activitySchema = mongoose.Schema({
  title: { type: String, required: true},
  location: {type: String, required: true},
  date: {type: Date, required: true},
  time: {type: String, required: true},
  creator: { type: Schema.Types.ObjectId, ref: 'User' },
  ralliers: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

// User Schema
var userSchema = mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true},
  passwordUH: { type: String, required: true},
  email: {type: String, required: true, unique: true},
  imageURL: { type: String},
  friends : [{ type: Schema.Types.ObjectId, ref: 'User' }],
  rallies: [{type: Schema.Types.ObjectId, ref: 'Activity'}]
});

activitySchema.pre('remove', function (next) {
  var thisActID = this._id;
  console.log("Removing " + thisActID + "from all users");
  User.find({}, function(err, allUsers) {
    for(var i = 0; i < allUsers.length; i++) {
      allUsers[i].rallies.remove(thisActID);
      allUsers[i].save();
    }
  });
  next();
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
  app.use(flash());
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
      Activity.find({$and: [{creator: {$in: friendsIDS}}, {date: {$gt : new Date()}}, {_id: {$nin: curUser.rallies}}]} , function(err, acts){ //just after $in term put a comma then, , {_id: {$nin: curUser.rallies}}
        console.log("printing list of activities" + acts);

        res.render('index', {user: req.user,  hasGrid: false, allActivities: acts, message: req.flash('error'), success: req.flash('success')});
      });
    });
  } else {
    res.render('index', { user: req.user , message: req.flash('error'), success:req.flash('success')});
}
}); 


app.get('/grid', function(req, res){
  //hasGrid = true;
  if(req.isAuthenticated()) {
    User.find({username: req.user.username}, function(err, result) {
      if(err) {console.log(err); res.send(500);}
      var curUser = result[0];
      var friendsIDS = curUser.friends;
      Activity.find({$and: [{creator: {$in: friendsIDS}}, {_id: {$nin: curUser.rallies}}]} , function(err, acts){ //just after $in term put a comma then, , {_id: {$nin: curUser.rallies}}
        console.log("printing list of activities" + acts);

        res.render('index', {user: req.user, hasGrid: true, allActivities: acts, message: req.flash('error'), success: req.flash('success')});
      });
    });
  } else {
    res.render('index', { user: req.user , message: req.flash('error'), success:req.flash('success')});
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
    cloudinary.uploader.upload(tmp_path, function(fileUp){
      User.find({username: req.user.username}, function(err, result) {
        var curUser = result[0];
        curUser.imageURL = fileUp.url;
        curUser.save();
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
          res.render('account', { user: req.user, userRallies: activities, joined: acts, success: req.flash('success')});
        });
        
      })
    });
  } else {
    res.render('account', { user: req.user});
  }
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user, message: req.flash('error')});
});

app.get('/signup', function(req, res){
  res.render('signup', { user: req.user, message: req.flash('error')});
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
        req.flash('success', "Success! Rally added");
        res.send(200);
      });
  });
});
/*
app.post('/unrally', function(req, res) {
  var form_data = req.body;
  var rallyID = form_data["data-id"];
  User.find({username: req.user.username}, function(err, result) {
      var curUser = result[0];
      Activity.find({_id: rallyID}, function(err, act) {
        var activity = act[0];
        delete activity.ralliers[curUser._id];
        res.send(200);
      });
  });
});
*/

app.post('/activity/unrally', function(req, res) {
  var rallyid = req.body['rally_id'].toString();
  
  //console.log("userid we're pulling from " + req.user._id + " what we're pulling " + rallyid);
  User.findByIdAndUpdate(req.user._id, {$pull: {rallies: rallyid}}, function(opt) {
    Activity.findByIdAndUpdate(rallyid, {$pull: {ralliers: req.user._id}}, function(opttwo) {
      req.flash('success', "Successfully unrallied!");
      res.send(200);
    });
  });
});

app.post('/user/delete', function(req, res) {
  var yourid = req.body['yourID'].toString();
  var friendid = req.body['friendID'].toString();
  User.update({_id: yourid}, {$pull:{friends: friendid}}, function(err) {
    if(err) res.send(500);
    else {
      req.flash('success', "Success! Friend removed");
      res.redirect('/friends');
    }
  });
  
});

app.post('/activity/delete', function(req, res) {
  var actID = req.body.hiddenID;
  Activity.remove({_id: actID}, function(err) {
    if(err) {
      console.log(err);
      res.send(500);
    }
    else {
      User.update({}, {$pull: {rallies: actID}}, function(err) {
        if(err) res.send(500);
        console.log(actID + " removed!");
        req.flash('success', "Success! Activity removed");
        res.redirect('/account');
      });
      
    }
  }); 
});

app.post('/activity/edit', function(req, res) {
  var actID = req.body.idNumber;
  Activity.find({_id: actID}, function(err, act) {
    if(err) {
      console.log(err);
      res.send(500);
    }
    else {
      var activity = act[0];
      console.log("--->>> this is the activity before: " + activity);
      activity.title = req.body.activityName;
      activity.location = req.body.activityLocation;
      //activity.date = req.body.activityDate; //for some reason the code to set the date input field (i.e. value=activity.date) does not work in specificActivity.ejs
                                                //thus, I've commented out the date field so that it is not actually changeable. Uncomment this code when specificActivity.ejs is working.
      activity.time = req.body.activityTime;
      console.log("--->>> this is the activity after: " + activity);
      activity.save(afterSaving);
      
      function afterSaving(error) {
        if(error) {
          console.log(error);
        } else {
          res.send(200);
          res.redirect('/account');
        }
      }
    }
  }); 
});

app.post('/user/new', function(req, res) {
  var form_data = req.body;
  var usernamer = form_data['username'];
  var emailr = form_data['email'];
  User.find({$or: [{username: usernamer}, {email: emailr}]},function(err, result) {
    if(result.length == 0) {
      console.log("Got here!");
      var newUser = new User({
        "username": usernamer,
        "password": form_data['password'],
        "passwordUH": form_data['password'],
        "email": emailr,
        "imageURL": "http://placekitten.com/g/200/300"
      });
      newUser.save(afterSave);
      //console.log("Added!: "+ form_data);
      function afterSave(err) {
        if(err) {console.log(err); res.send(500);}
        res.send(200, {data: '/login'});
      }
    }
    else {
      console.log("Got here instead...!");
      req.flash('error', "Username or email already exists. Try again!");
      res.send(200, {data: '/signup'});
    }
  });
  

});

app.get('/friends', function(req, res){
  var me = req.user;
  User.find({username: req.user.username}, function(err, self) {
    var me = self[0];
    //return an array of my friends, rendered to friends.ejs
    var friendsIDS = me.friends;
    User.find({_id: {$in: friendsIDS}}, function(err, friends){
      res.render('friends', {user: req.user, userFriends: friends, message: req.flash('error'), success: req.flash('success')});
    });
  });
});

app.post('/friend/new', function(req, res){
  var form_data = req.body;
  User.find({username: form_data['username']}, function(err, result) {
    if(err) {console.log(err); res.send(500);}
    if(result.length > 0) {
      var friend = result[0];
      User.find({username: req.user.username}, function(err, self) {
        var selfUser = self[0]; //only push from our side
        console.log("curUserID: " + selfUser._id + " --------- friendID: " + friend._id);
        console.log("-------------------------- " + selfUser._id.equals(friend._id));
        for(var i = 0; i < selfUser.friends.length; i++) {
          if(((selfUser.friends)[i]).equals(friend._id)) {
            console.log("ERROR: FRIEND EXISTS");
            req.flash('error', "Error, this friend has already been added. Try adding another!") ;
            res.send(200);
            return;
          }
        }
        if(selfUser._id.equals(friend._id)) {
          console.log("ERROR, TRIED ADDING SELF");
          req.flash('error', "Error, you can't add yourself. Try again");
          res.send(200);
        }
        else {
          selfUser.friends.push(friend._id);
          selfUser.save();
          req.flash('success', "Friend successfully added!");
          res.send(200);
        }
        
      });
    }
    else {
      req.flash('error', "Error, user not found. Try again") ;
      res.send(200);
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
      req.flash('error', "Error: Username entered doesn't match password. Try again!");
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
    User.find({_id: {$in: activity.ralliers}},function(err, query) {
      res.render('specificActivity', {user: req.user, activity: activity, ralliers: query});
    });
  });
});


app.get('/user/:id', function(req, res) {
  var userID = req.params.id;
  User.find({_id: userID}, function(err, result){
    var friend = result[0];
    Activity.find({_id: {$in: friend.rallies}} , function(err, acts){
      res.render('specificFriend', {user: req.user, friend: friend, friendRallies: acts});
    });
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
