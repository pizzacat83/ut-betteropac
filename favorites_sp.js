void(function(){
    var base='<!DOCTYPE html><html><head><meta charset="utf-8" /><title>お気に入り</title></head><body style="font-family: sans-serif;"><h1>お気に入り</h1>図書館を選択：<select id="library" style:"border: 1px #ccc; border-radius:5px;"></select><button id="apply">適用</button><table id="favorites-table"><tr><th>資料名</th><th colspan="2">状態</th></tr></table></body></html>';
    document.write(base);



    var cache = [];

    function getConditions(bibid){
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "https://opac.dl.itc.u-tokyo.ac.jp/opac/opac_details/?bibid="+bibid, false);
        xhr.send();
        var html = (new DOMParser()).parseFromString(xhr.responseText,"text/html");
        var campuses = html.getElementById("cantable").getElementsByClassName("hold-area")[0].children;
        var res = [];
        for(var campus of campuses){
            var campusName = $(campus).children("span").text().replace("キャンパス","");
            //var conditions = $(campus).find("[id^=blstat_detail_BL]");
            var locations = $.map($(campus).find("td.hold_detail_1:contains('配架場所')").next(), (x)=>{return x.innerText.replace(/・.*/,"").trim();});
            var blipkeys = $.map($(campus).find("[id^=blstat_detail_BL]"),(x)=>{return x.id.match(/BL[0-9]+/)[0];});
            //var cnt = {};
            var temp = {};
            for(var i = 0; i < blipkeys.length; ++i){
                xhr.open("GET","https://opac.dl.itc.u-tokyo.ac.jp/opac/opac_blstat/?phasecd=50&bbcd=1&blipkey="+blipkeys[i],false);
                xhr.send();
                var condition = xhr.responseText.replace(/[([].*/, "");
                condition = condition ? condition : "在架";
                if(temp[condition])temp[condition].push(locations[i]);else temp[condition] = [locations[i]];
            }
            var temp2 = [];
            for(var key in temp){
                temp2.push({condition:key, locations:temp[key]});
            }
            res.push({campus:campusName, conditions:temp2});
        }
        return res;
    }


    function getFavorites(){
        var xhr = new XMLHttpRequest();
        xhr.open("GET","https://opac.dl.itc.u-tokyo.ac.jp/opac/myopac/bookmark/", false);
        xhr.send();
        var html=(new DOMParser()).parseFromString(xhr.responseText,"text/html");
        var res=[];
        for(book of html.getElementsByTagName("li")){
            //var url = "https://opac.dl.itc.u-tokyo.ac.jp"+[].filter.call(book.getElementsByTagName("a"),(y)=>{return y.href.search("javascript")!=0;})[0].getAttribute("href");
            var bibid = [].filter.call(book.getElementsByTagName("a"),(y)=>{return y.href.search("javascript")!=0;})[0].href.match(/\/([0-9]+)\//)[1];
            var name = [].filter.call(book.getElementsByTagName("input"),(x)=>{return x.name=="label";})[0].value;
            res.push({"name": name, "bibid": bibid});
        }
        return res;
    }


    function getLibraryList(){
        var xhr = new XMLHttpRequest();
        xhr.open("GET","https://opac.dl.itc.u-tokyo.ac.jp/opac/opac_search/", false);
        xhr.send();
        var html=(new DOMParser()).parseFromString(xhr.responseText,"text/html");
        return new Set([].map.call(html.getElementsByName("place_exp")[0],(x)=>{return x.text.replace(/・.*/,"");}));
    }



    var libs = getLibraryList();

    for(var lib of libs){
        $("#library").append($("<option></option>").text(lib).val(lib));
    }


    cache=[];
    var _ = 0;
    for (var book of getFavorites()){
        var conditions = getConditions(book.bibid);
        
        function sortFunc(x,y){
            if(x.condition=="在架"){
                return false;
            }
            if(y.condition=="在架"){
                return true;
            }
            return x.condition > y.condition;
        }
        var available = new Set(conditions.map((z)=>{return z.conditions.filter((y)=>{return y.condition=="在架";}).map((x)=>{return x.locations;}).reduce((x,y)=>{return x.concat(y);},[]);}).reduce((x,y)=>{return x.concat(y);},[]));
        var len = conditions.length;
        var query = "book-"+_;
        for(var i = 0; i < len; ++i){
            var row = $("<tr></tr>").addClass(query);
            if(i === 0) row.append($("<td></td>").text(book.name).attr({rowspan: len}));
            row.append($("<th></th>").text(conditions[i].campus).css("white-space","nowrap"));
            conditions[i].conditions = conditions[i].conditions.sort(sortFunc);
            var text = conditions[i].conditions.map((x)=>{return x.condition+": "+x.locations.join(" ");}).join("<br>");
            row.append($("<td></td>").html(text));
            $("#favorites-table").append(row);
        }
        

        cache.push({query: query, available: available});

        
        ++_;
    }
    function highlight(){
        var lib = $("#library").val();
        localStorage["library"] = lib;
        for(var book of cache){
            if(book.available.has(lib)){
                $("."+book.query).css("background-color", "#bbddbb");
            }else{
                $("."+book.query).css("background-color", "#fff");
            }
        }
    }
    $("body").css("font-family", "sans-serif");
    $("table").css({"border": "1px solid #ccc", "border-collapse":"collapse", "font-size": "0.6em"});
    $("th").css("border", "1px solid #ccc");
    $("td").css("border", "1px solid #ccc");
    $("button").css({"border":"1px solid #ccc", "border-radius":"3px", "background-color": "#f8f8f8"});
    $("select").css({"border":"1px solid #ccc", "border-radius":"3px", "background-color": "#fff"});
    $("#apply").click(highlight);

    if(localStorage["library"]){
        $("#library").val(localStorage["library"]);
        highlight();
    }
}());
