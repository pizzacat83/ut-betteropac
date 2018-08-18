$(function(){
    $("#us_service").find("ul").prepend($("<li></li>").html("<a href='chrome-extension://"
    + chrome.i18n.getMessage("@@extension_id")
    + "/favorites.html'>お気に入り</a>"));
});