$(function(){
    $("#save").click(function() {
        if($("auto-extend").val() > 0){
            localStorage["auto-extend"] = $("auto-extend").val();
        } else {
            alert("不正な値です");
        }
    });

    $("#auto-extend").val(localStorage["auto-extend"]);
    
});