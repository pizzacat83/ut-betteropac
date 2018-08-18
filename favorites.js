let cache = [];



$(function(){
    let bg = chrome.extension.getBackgroundPage();

    let libs = bg.getLibraryList();
    
    for(let lib of libs){
        $("#library").append($("<option></option>").text(lib).val(lib));
    }

    
    cache=[];
    let _ = 0;
    for (let book of bg.getFavorites()){
        let conditions = bg.getConditions(book.bibid);
        
        
        function sortFunc(x,y){
            if(x.condition=="在架"){
                return false;
            }
            if(y.condition=="在架"){
                return true;
            }
            return x.condition > y.condition;
        }
        let available = new Set(conditions.map((z)=>{return z.conditions.filter((y)=>{return y.condition=="在架";}).map((x)=>{return x.locations;}).reduce((x,y)=>{return x.concat(y);},[]);}).reduce((x,y)=>{return x.concat(y);},[]));
        let len = conditions.length;
        let query = "book-"+_;
        for(let i = 0; i < len; ++i){
            let row = $("<tr></tr>").addClass(query);
            if(i === 0) row.append($("<td></td>").append($("<a></a>").attr("href", "https://opac.dl.itc.u-tokyo.ac.jp/opac/opac_link/bibid/"+book.bibid+"/").text(book.name)).attr({rowspan: len}));
            row.append($("<th></th>").text(conditions[i].campus));
            conditions[i].conditions = conditions[i].conditions.sort(sortFunc);
            let text = conditions[i].conditions.map((x)=>{return x.condition+": "+x.locations.join(" ");}).join("<br>");
            row.append($("<td></td>").html(text));
            $("#favorites-table").append(row);
        }
        

        cache.push({query: query, available: available});
        
        ++_;
    }
    function highlight(){
        let lib = $("#library").val();
        localStorage["library"] = lib;
        for(let book of cache){
            if(book.available.has(lib)){
                $("."+book.query).addClass("available");
            }else{
                $("."+book.query).removeClass("available");
            }
        }
    }

    $("#apply").click(highlight);

    if(localStorage["library"]){
        $("#library").val(localStorage["library"]);
        highlight();
    }
});
