$(document).ready(function() {
});

function isValidEmailAddress(emailAddress) {
    var pattern = new RegExp(/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i);
    return pattern.test(emailAddress);
};

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
        $("#home").addClass('active');
    } else if(location.pathname.split("/")[1] == "account"){
        $("#account").addClass('active');
    } else if(location.pathname.split("/")[1] == "friends"){
        console.log("Test!");
        $("#friends").addClass('active');
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
        if(!isValidEmailAddress(email)) {
            $("#signup").prepend("<div class='alert alert-danger'>Error: Email is not valid. Try again</div>");
        }
        if(password == '' || username == '' || email == '') {
            $("#signup").prepend("<div class='alert alert-danger'>Error: Make sure all fields are filled in</div>");
        }
        else if(isValidEmailAddress(email) && username.length > 0 && password.length > 0) {
            //alert("Added " + name); 
            var json = {
                'username': username,
                'password': password,
                'email': email
            };
            //alert("Added " + name); 
            $.post('/user/new', json, function(data) {
                window.location.href= data.data;
            });
        }                
});
/*
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
*/

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
                //window.location.href = '/account/'; // reload the page
                $("#myModal").modal('hide');
                $("#hiddenNotice").html("<div class='alert alert-success'> Congratulations! New activity added</div>");
            });
            
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


$(document).on("click", "#unrallyButton", function(e) { 
    var rallyID = $('#rally_id_hidden').val(); 
    var json = {
        'rally_id': rallyID
    };
    $.post('/activity/unrally', json, function() {
        window.location.href='/account';
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
                //$("#hiddenNotice").html("<div class='alert alert-success'> Congratulations! Added " + friendName +  " successfully</div>");
            });
        }                
});