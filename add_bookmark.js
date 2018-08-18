void(function(){
    var xhr = new XMLHttpRequest();
    xhr.open("GET", 
        "https://opac.dl.itc.u-tokyo.ac.jp/opac/myopac/bookmark/add/?"
        + "bmname=" + encodeURIComponent($("input[name='h_trd']").val())
        + "&bibid=" + document.location.toString().match(/&bibid=([0-9]+)/)[1]
        + "&ctkey=&reqCode=insert",
        false);
    xhr.send();
    if(xhr.status==200&&xhr.responseText)alert("登録しました。");
}());
