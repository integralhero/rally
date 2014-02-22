$(document).ready(function() {
    $("a.firstLink").pageslide();
});

$(function() {
  $('nav a[href^="/' + location.pathname.split("/")[1] + '"]').addClass('active');
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
        var activityLocation = $('#activityForm #activityLocation').val();
        var activityDate = $('#activityForm #activityDate').val();
        var activityTime = $('#activityForm #activityTime').val();
        if(activityName.length > 0) { 
            var json = {
                'title': activityName,
                'location': activityLocation,
                'date': activityDate,
                'time': activityTime
            };
            $.post('/activity/new', json, function() {
                window.location.href = '/'; // reload the page
            });
        }                
});

$(document).on("click", ".rallyBtn", function(e) {
    e.preventDefault();
    var dataID = $(this).closest(".activity").attr("data-id");
    var json = {
        'data-id': dataID
    };
    $.post('/rally', json, function() {
        window.location.href = '/'; // reload the page
    });
});

$(document).on("click", "#addFriendButton", function(e) { 

        var friendName = $('#addFriendForm #friendName').val();
        if(friendName.length > 0) { 
            var json = {
                'username': friendName
            };
            $.post('/friend/new', json, function() {
                window.location.href = '/friends'; // reload the page
            });
        }                
});