function $(a) {
	if( a == "force_acp_object_imput" ){
		return window.acpObj.force_input_obj;
	}	
	else if( a == "force_acp_object_form" ){
		return window.acpObj.force_form_obj;
	}
	
    return document.getElementById(a)
}

function addLoadEvent(a) {

	window.addEventListener("load", a); 

}


var oRequest;

function startAutocomplete(){
	window.acpObj = {
		force_input_obj: $("q"),
		force_form_obj: $("cse-search-box"),
		click_callback: function(){
	
		},
		acp_searchbox_id: "force_acp_object_imput",                  /* ID of the search <input tag   */
		acp_search_form_id: "force_acp_object_form",       /* ID of the search form         */				
		acp_partner: "flsh",         /* AutoComplete+ partner ID      */
		acp_suggestions: "7",                   /* Number of suggestions to get  */
	};	
	
   	var c = $(window.acpObj.acp_searchbox_id);
	
	c.addEventListener( "keyup", function(event){
		window.acpObj.ac.s(event,c);
	} );
	
    var b = document.createElement("table");
    b.setAttribute("class", "acp_ltr");
    b.setAttribute("cellspacing", "0");
    b.setAttribute("style", "display:none");
    b.setAttribute("id", "suggest");
    var a = document.createElement("tbody");
    a.setAttribute("id", "suggestions");
    b.appendChild(a);
    c.parentNode.appendChild(b);
    if (!window.acpObj.acp_sig) {
        window.acpObj.acp_sig = "on"
    }
    if (window.acpObj.acp_sig == "on") {
        tfoot = document.createElement("tfoot");
        tr = document.createElement("tr");
        td = document.createElement("td");

        tr.appendChild(td);
        tfoot.appendChild(tr);
        b.appendChild(tfoot)
    }
		
	(function () {
	    var b = {
	        y: -1,
	        table: $("suggestions")
	    };
	
	    function g(h, k) {
	        for (var j = h.table.rows.length - 1; j >= 0; j--) {
	            h.table.rows[j].style.backgroundColor = ""
	        }
	        if (k === undefined) {
	            h.table.rows[h.y].style.backgroundColor = "#eee";				
	            $(window.acpObj.acp_searchbox_id).value = h.table.rows[h.y].cells[0].getAttribute("queryText");
	        } else {
	            k.style.backgroundColor = "#eee";
	            h.y = k.getAttribute("sugID")
	        }
	    }
	    function c(m, k, l) {
	        var n;
	        if (document.all) {
	            n = "rules"
	        } else {
	            if (document.getElementById) {
	                n = "cssRules"
	            }
	        }
	        var j = document.styleSheets;
	        for (var h = 0; h < document.styleSheets[j.length - 1][n].length; h++) {
	            if (document.styleSheets[j.length - 1][n][h].selectorText == m) {
	                document.styleSheets[j.length - 1][n][h].style[k] = l;
	                return
	            }
	        }
	    }
	    function e(i) {
	        if (!window.acpObj.acp_b) {
	            window.acpObj.acp_b = 1
	        }
	        if (!b.table) {
	            b.table = $("suggestions");
	            var j = $(window.acpObj.acp_searchbox_id)
	        }
	        if (!window.acpObj.acp_api) {
	    
	        }
	  		
			var h = "http://google.com/complete/search?output=toolbar&q="+encodeURIComponent(i);    
	        
	        this.c(h)
	    }
	    function d(j) {
			var req = new XMLHttpRequest();
			req.open('GET', j, true);
			req.inst = this;
			req.q = "";
			req.onreadystatechange = function (aEvt) {
			  if (req.readyState == 4) {
			     if(req.status == 200){
				 	var r = req.responseXML;
					if( r ){
						var elems = r.getElementsByTagName( "suggestion" );
						var items = [];
						for( var i = 0; i != elems.length; i++ ){
							items.push( elems[i].getAttribute("data") );
						}
						
						a({
							"items": items,
							"query": this.q
						});
					}
					
					
				 }
			  }
			};
			req.send(null);
	     
	    }
	    function f(i, h) {
	
	        if (h.value.length == 0) {
	            $("suggest").style.display = "none";
	            return;
	        }
	        
	            
	        var i = i || event;
	        switch (i.keyCode) {
	        case 38:
	            b.y--;
	            break;
	        case 40:
	            b.y++;
	            break;
	        case 13:
	        case 39:
	        case 37:
	            return;
	            break;
	        default:
	            this.r(h.value);
	            b.y = -1;
	            return;
	        }
	                
	        
	        
	        if (b.y < 0) {
	            b.y = b.table.rows.length - 1;
	        }
	        if (b.y >= b.table.rows.length) {
	            b.y = 0;
	        }
	        if (b.y >= b.table.rows.length) {
	            b.y = 0;
	        }
	        
	        	
	        
	        this.f(b)
	    }
	    function a(m) {
			dd_hide();
			
	        var i = $("suggestions");
			
	        var l = String(m.items).split(",");
	        while (i.rows && i.rows.length) {
	            i.deleteRow(-1)
	        }
	        for (s in l) {
	            if (l[s] == "") {
	                continue
	            }
	            var k = i.insertRow(-1);
	            var h = k.insertCell(0);
	            h.style.display = "block";
	            
				var bolderText = document.createElement( "b" );
				bolderText.textContent = l[s].substr(m.query.length, l[s].length);
				var queryText = document.createTextNode( m.query );
												
				var newdiv = document.createElement("div");
				newdiv.appendChild( queryText );
				newdiv.appendChild( bolderText );
	            
				h.setAttribute( "queryText", l[s] + m.query );
				
	            h.appendChild( newdiv );   
				                    
	            h.style.width = "";
	            k.setAttribute("sugID", s);
	            k.onmouseover = function () {
	                window.acpObj.ac.f(b, this)
	            };
	            k.onclick = function () {
	                $(window.acpObj.acp_searchbox_id).value = this.cells[0].getAttribute( "queryText" );
	                if( typeof window.acpObj.click_callback != "undefined" ){
						window.acpObj.click_callback();
					}
					else{
						$(window.acpObj.acp_search_form_id).submit();	
					}
					$(window.acpObj.acp_searchbox_id).focus();
					autocompleteHide();
	            }
	        }
	        if ($("suggest").style.display == "none") {
	            $("suggest").style.display = "block"
	        }
	        if (i.rows.length == 0) {
	            $("suggest").style.display = "none"
	        }
	    }
	    window.acpObj.ac = {
	        s: f,
        h: a,
        r: e,
        c: d,
        f: g,
        css: c
    }
})();

}

function autocompleteHide(){
	var suggest = $("suggest");
	if(suggest){
		suggest.style.display = "none"
	}	
}

function acp_new(a) {
    window.acpObj.ac.h(a)
};