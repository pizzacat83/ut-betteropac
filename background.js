function getBorrowedStatus(){
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "https://opac.dl.itc.u-tokyo.ac.jp/opac/service_fileout/?lang=0&category=RE&check=0", false);
    xhr.send();
    var csrfmiddlewaretoken = xhr.responseText.match(/name='csrfmiddlewaretoken' value='(.+?)'/)[1];
    var data=new FormData();
    data.append("disp","output");
    data.append("lang",0);
    data.append("check",1);
    data.append("category","RE");
    data.append("charset", "UTF-8");
    data.append("csrfmiddlewaretoken",csrfmiddlewaretoken);
    xhr.open('POST', "https://opac.dl.itc.u-tokyo.ac.jp/opac/service_fileout/?lang=0&category=RE&check=1", false);
    xhr.send(data);
    fileurl = xhr.responseText.match(/<a href='(\/opac-spool\/tsv_.+?)'/)[1];
    xhr.open("GET", "https://opac.dl.itc.u-tokyo.ac.jp"+fileurl, false);
    xhr.send();
    return xhr.responseText.split("\n").slice(0,-1).map((x)=>{return x.split("\t")});
}

function is_loggedin(){
    try{
        xhr = new XMLHttpRequest();
        xhr.open("GET","https://opac.dl.itc.u-tokyo.ac.jp/opac/opac_search/", false);
        xhr.send();
        return xhr.responseText.search("logout")!=-1;
    } catch(e) {
        return false;
    }
}

let login_open = false;

function login(){
    if(!login_open){
        login_open = true;

        let xhr = new XMLHttpRequest();
        loginroot="https://opac.dl.itc.u-tokyo.ac.jp/opac/opac_search/?loginMode=disp&amp;lang=0&amp;opkey=&amp;cmode=0&amp;smode=0";
        xhr.open('GET', loginroot, false);
        xhr.send();
        match = xhr.responseText.match(/<a onClick="back_opac\('(.+?)'\)"><img src=".+?" alt="login_shibboleth" \/>/)
        if(match==null){
            login_open = false;
            return;
        }
        loginurl=match[1].replace(/&amp;/g,"&")
        xhr.open('GET',"https://opac.dl.itc.u-tokyo.ac.jp"+loginurl,true);
        xhr.send();
        xhr.onload = function (e) {
            let formtext,loginurl;
            if(xhr.responseText.match(/<form method="post" id="securelogin" action=".">(.+?)<\/form>/s)){ // eslint-disable-line no-invalid-regexp
                formtext=xhr.responseText.match(/<form method="post" id="securelogin" action=".">(.+?)<\/form>/s)[1]; // eslint-disable-line no-invalid-regexp
                posturl="https://opac.dl.itc.u-tokyo.ac.jp/opac/opac_search/";
                let f=document.createElement("form");
                f.style.display = 'none';
                f.innerHTML=formtext;
                let data=new FormData();
                for(let i=0; i<f.elements.length; i++){
                data.append(f.elements[i].name, f.elements[i].value);
            }
                let xhr2 = new XMLHttpRequest();
                xhr2.open('POST', posturl, false);
                xhr2.send(data);
                login_open = false;
            }else{
                chrome.tabs.create({"url":xhr.responseURL,"active":false},
                function(tab){
                    //console.log(tab.id);
                    tabcnt=setInterval(function(id){
                        
                        chrome.tabs.get(id,(t)=>{
                            if(!t){
                                // tab deleted
                                clearInterval(tabcnt);
                                login_open = false;
                            }
                            if(t.url&&t.url.substring(0,"https://opac.dl.itc.u-tokyo.ac.jp".length)=="https://opac.dl.itc.u-tokyo.ac.jp"&&t.status=="complete"){
                                clearInterval(tabcnt);
                                login_open = false;
                                chrome.tabs.remove(id,()=>{});
                            }
                        })

                    },100,tab.id);
                });

            }

        };
    }
}


function getConditions(bibid){
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "https://opac.dl.itc.u-tokyo.ac.jp/opac/opac_details/?bibid="+bibid, false);
    xhr.send();
    let html = (new DOMParser()).parseFromString(xhr.responseText,"text/html");
    campuses = html.getElementsByClassName("cam_disp");
    let res = [];
    for(campus of campuses){
        let campusName = campus.getElementsByTagName("h4")[0].innerText.replace("キャンパス","");
        let conditions = [].filter.call(campus.getElementsByClassName("CONDITION"),(x)=>{return x.nodeName=="TD"});
        let locations = [].filter.call(campus.getElementsByClassName("LOCATION"),(x)=>{return x.nodeName=="TD"}).map((x)=>{return x.innerText.trim().replace(/・.*/,"");});
        //let cnt = {};
        let temp = {};
        for(let i = 0; i < conditions.length; ++i){
            let blipkey = conditions[i].getElementsByTagName("span")[0].id.match(/BL[0-9]+/)[0];
            xhr.open("GET","https://opac.dl.itc.u-tokyo.ac.jp/opac/opac_blstat/?phasecd=50&bbcd=1&blipkey="+blipkey,false);
            xhr.send();
            let condition = xhr.responseText.replace(/[\(\[].*/, "");
            condition = condition ? condition : "在架";
            if(temp[condition])temp[condition].push(locations[i]);else temp[condition] = [locations[i]];
        }
        let temp2 = [];
        for(let key in temp){
            temp2.push({condition:key, locations:Array.from(new Set(temp[key]))});
        }
        res.push({campus:campusName, conditions:temp2});
    }
    return res;
}

function extendAllBooks(){
    if(is_loggedin()){
        let days = localStorage["auto-extend"];
        let books = getBorrowedStatus();
        let now = new Date();
        for(book of books){
            let due = new Date(book[4]);    // ハードコーディングは避けられない
            if((due-now)/1000/60/60/24+1 < days){
                // ミリ秒差を日差に変換。dueが0:00だが本当は閉館時間なので，感覚的に1日足す方が自然。
                extendBook(book[1]);    // 延長できない資料も延長していくが，向こうが勝手に無視してくれるはず
            }

        }
    }
}

function extendBook(bookid){
    let xhr = new XMLHttpRequest();
    xhr.open("GET","https://opac.dl.itc.u-tokyo.ac.jp/opac/odr_stat/", false);
    xhr.send();
    let html=(new DOMParser()).parseFromString(xhr.responseText,"text/html");
    let form=html.getElementById("srv_odr_stat_re");
    form.bookid.value = bookid;
    form.reqCode.value = "extre";
    form.disp.value = 're';
    form_data = new FormData(form);
    xhr = new XMLHttpRequest();
    xhr.open("POST","https://opac.dl.itc.u-tokyo.ac.jp/opac/odr_stat/", false);
    xhr.send(form_data);
}

function getFavorites(){
    let xhr = new XMLHttpRequest();
    xhr.open("GET","https://opac.dl.itc.u-tokyo.ac.jp/opac/myopac/bookmark/", false);
    xhr.send();
    let html=(new DOMParser()).parseFromString(xhr.responseText,"text/html");
    let res=[];
    for(book of html.getElementsByTagName("li")){
        let bibid = [].filter.call(book.getElementsByTagName("a"),(y)=>{return y.href.search("javascript")!=0;})[0].href.match(/\/([0-9]+)\//)[1];
        let name = [].filter.call(book.getElementsByTagName("input"),(x)=>{return x.name=="label"})[0].value;
        res.push({"name": name, "bibid": bibid});
    }
    return res;
}

function getLibraryList(){
    let xhr = new XMLHttpRequest();
    xhr.open("GET","https://opac.dl.itc.u-tokyo.ac.jp/opac/opac_search/", false);
    xhr.send();
    html=(new DOMParser()).parseFromString(xhr.responseText,"text/html");
    return new Set([].map.call(html.getElementsByName("place_exp")[0],(x)=>{return x.text.replace(/・.*/,"")}));
}

if(!localStorage["auto-extend"]){
    localStorage["auto-extend"]=3;
}

login();
setInterval(login,5*60*1000);
setInterval(extendAllBooks, 5*60*1000);

