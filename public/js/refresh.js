$(document).ready(function() {
  
});

$(document).on("click", "#addUserButton", function(e) { 
        var username = $('#new-user-form #nameField').val();
        var password = $('#new-user-form #passwordField').val();
        console.log("Added " + username+ "|" + password); 
        if(username.length > 0 && password.length > 0) {
            //alert("Added " + name); 
            var json = {
                'username': username,
                'password': password
            };
            //alert("Added " + name); 
            $.post('/user/new', json, function() {
                window.location.href = '/login'; // reload the page
            });
        }                
});

$(document).on("click", "#addActivityButton", function(e) { 
        var activityName = $('#activityForm #activityName').val();
        if(activityName.length > 0) { 
            var json = {
                'title': activityName
            };
            $.post('/activity/new', json, function() {
                window.location.href = '/'; // reload the page
            });
        }                
});

$(document).on("click", "#addActivityButton", function(e) { 
        var friendName = $('#add-friend-form #friendName').val();
        if(friendName.length > 0) { 
            var json = {
                'username': username
            };
            $.post('/friend/add', json, function() {
                window.location.href = '/'; // reload the page
            });
        }                
});