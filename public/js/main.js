$(document).ready(function(){

    // Function to toggle the "Your Review" form state
    // (in ready() scope for simplicity)
    function toggleYourReviewState(state, message){
        if(state !== undefined){
            var btnclass;
            if(state === "add"){
                $('textarea', $yourReview).val('').data('state','add');
                $('button', $yourReview).text("Add your review");
                btnclass = "success";
            }else if(state == "edit"){
                $('textarea', $yourReview).val(message).data('state','edit');
                $('button', $yourReview).text("Edit your review");
                btnclass = "warning";
            }else if(state == "delete"){
                $('textarea', $yourReview).data('state','delete');
                $('button', $yourReview).text("Delete your review");
                btnclass = "danger";
            }
            $('button', $yourReview).attr('class', function(i, cls){
                console.log(btnclass);
                return cls.replace(/btn-[^ ]+/,'btn-'+btnclass);
            });
        }
    }

    // Some references we're going to use across the script
    var $results = $('#results');
    var $list = $('ul',$results);
    var $search = $('#search');
    var $yourReview = $('#yourreview');
    // Prepare review section
    toggleYourReviewState("add");

    // Search form
    $search.submit(function(event){

        // Stop page from refreshing
        event.preventDefault();

        // Retrieve the username query
        var username = $('input', $search).val();

        // Show the results pane
        $results.fadeIn();

        // Show a loading icon
        $list.empty().append('<li class="text-center"><i class="fa fa-spinner fa-spin fa-4x"></i></li>');

        // Do the AJAX request
        $.get('/search/'+username, function(response){

            // Handle the list of reviews that we receive
            $list.empty();
            if(response.reviews.length===0){

                // If there are no reviews, let the user know
                $list.append('<li class="list-group-item alert alert-warning">None of your friends have left a review for <strong>'+username+'</strong></li>');

            }else{

                // If we do have reviews, add each review to the list
                response.reviews.forEach(function(review){
                    $list.append('<li class="list-group-item"><h3><a href="http://www.facebook.com/profile.php?id='+review.reviewer_fbid+'">'+review.reviewer_name+'</a> says:</h3><p>'+review.message+'</p></li>');
                });

            }

            // Now handle the leave section
            if(response.myreview){
                toggleYourReviewState("edit", response.myreview);
            }else{
                toggleYourReviewState("add");
            }

        });
    });

    // Leaving a review
    $yourReview.submit(function(event){

        // Prevent page from refreshing
        event.preventDefault();

        // Remove old result message
        $('li.alert-info', $list).hide();

        // Gather the username and message (we'll deal with the poster from the session)
        var username = $('input', $search).val();
        var message = $('textarea', $yourReview).val();

        // Make the AJAX request
        $.post('/add', {
            okcupid_username: username,
            message: message
        }, function(result){
            if(result == "ok"){
                // If everything went well, let the user know
                $list.append('<li class="alert alert-info list-group-item">Your review has been added</li>');
                toggleYourReviewState("edit", message);
            }else{
                //todo Make this a nicer warning message
                alert(result);
            }
        });

    });

    $('textarea', $yourReview).keyup(function(){
        var val = $(this).val();
        var state = $(this).data('state');
        if(val == "" && state == "edit"){
            toggleYourReviewState("delete"); 
        }else if(val != "" && state == "delete"){
            toggleYourReviewState("edit", val);
        }
    });

});
