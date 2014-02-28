$(document).ready(function() {
    $("a.firstLink").pageslide();
});

$(function() {
    $("#friendName").autocomplete({
      source: function (request, response) {
         $.ajax({
            url: "/search_friend",
            type: "GET",
            dataType: "json",
            data: request,  // request is the value of search input
            success: function (data) {
              //alert(data);
              // Map response values to fiedl label and value
               response($.map(data, function (item) {
                  return {
                     label: item.username,
                     value: item.username
                  };
                  }));
               }
            });
         },
         
         // The minimum number of characters a user must type before a search is performed.
         minLength: 3, 
         
         // set an onFocus event to show the result on input field when result is focused

    });
});
$(function() {
    console.log("OMG---------->>>>> "+location.pathname.split("/")[1] +"<<<<-------||");
    //console.log($('nav a[href^="/' + location.pathname.split("/")[1] + '"]');
    if(location.pathname.split("/")[1] == "") {
        $("#homenav").addClass('active');
    } else if(location.pathname.split("/")[1] == "account"){
        $("#profilenav").addClass('active');
    } else if(location.pathname.split("/")[1] == "friends"){
        console.log("Test!");
        $("#friendsnav").addClass('active');
    }
});

$("#forgotPass").click(function(e){
    $("#forgotPassDiv").toggle();
});

$(document).on("click", "#addUserButton", function(e) { 
        var username = $('#new-user-form #nameField').val();
        var email = $('#new-user-form #emailField').val();
        var password = $('#new-user-form #passwordField').val();
        console.log("Added " + username+ "|" + password); 
        if(username.length > 0 && password.length > 0) {
            //alert("Added " + name); 
            var json = {
                'username': username,
                'password': password,
                'email': email
            };
            //alert("Added " + name); 
            $.post('/user/new', json, function() {
                window.location.href = '/login'; // reload the page
            });
        }                
});

$(document).on("click", ".unrallybtn", function(e) {
    e.preventDefault();
    var dataID = $(this).closest(".activity").attr("data-id");
    var json = {
        'data-id': dataID
    };
    $.post('/unrally', json, function() {
        window.location.href = '/'; // reload the page
    });
});


$(document).on("click", "#emailButton", function(e) { 
        var email = $('#emailField').val();
        if(email.length > 0) {
            var json = {
                'email': email
            };
            $.post('/emaillookup', json, function() {
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
                window.location.href = '/account/'; // reload the page
            });
            $("#hiddenNotice").html("Added new activity " + activityName);
        }                
});

/*$(document).on("click", "#finishedEditingActivityButton", function(e) { 
        var activityId = $('#editActivityForm #idNumber').val();
        var activityName = $('#editActivityForm #activityName').val();
        var activityLocation = $('#editActivityForm #activityLocation').val();
        var activityDate = $('#editActivityForm #activityDate').val();
        var activityTime = $('#editActivityForm #activityTime').val();
        if(activityName.length > 0) { 
            var json = {
                'id':activityId,
                'title': activityName,
                'location': activityLocation,
                'date': activityDate,
                'time': activityTime
            };
            console.log(json);
            $.post('/activity/edit', json, function() {
                window.location.href = '/activity/'+activityName; // reload the page
            });
            $("#hiddenNotice").html("Edited activity " + activityName);
        }
})*/


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