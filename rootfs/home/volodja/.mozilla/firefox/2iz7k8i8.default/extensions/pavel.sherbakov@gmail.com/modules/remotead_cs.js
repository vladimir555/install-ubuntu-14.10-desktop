const DEFAULT_CSS = {
	"border": "none",
	"position": "absolute"
};
const CONTAINER_STYLES = [
	"top",
	"left",
	"right",
	"bottom",
	"position"
];

if( /https?:\/\/(www\.)?(everhelper\.me|localhost)\/remotead\//i.test( document.location.href ) ){
	
	// it's ad page

	document.addEventListener("DOMContentLoaded", function(){

		function getURLParameter(name) {
		    var v = (RegExp(name + '=' + '(.+?)(&|$)').exec(document.location.search)||[,null])[1];
		    
			if( v ){
				v = decodeURIComponent( v );
			}
			
			return v;			
		}
		
		var adId = getURLParameter("id");
		
	 	if( !adId ){
	 		return;
	 	}		
	 	
	 	var ignores = document.querySelectorAll(".ignore");
	 	for( var i = 0; i != ignores.length; i++ ){
	 		
	 		ignores[i].addEventListener("click", function(){
				
				chrome.runtime.sendMessage({
					a: "remoteAD:ignore",
					id: adId
				});
				
				chrome.runtime.sendMessage({
					a: "remoteAD:close",
					id: adId
				});
				
				window.parent.postMessage({
					a: "fvdsd:ad:close",
					id: adId
				}, "*");
	 			
	 		}, false);
	 		
	 	}
		
	}, false);
	
}


chrome.runtime.onMessage.addListener(function( msg ){
	
	console.log("Incoming " + msg.a + "\n");
	
	if( msg.a != "fvd:remotead:show" ){
		return;
	}		
			
	if( document.getElementById("fvdRemoteAdWrapper") ){
		return;
	}	

	function hideAD(){
		adContainer.style.opacity = 0;
		window.setTimeout(function(){
			
			overlay.parentNode.removeChild( overlay );
			
		}, 300);
	}

	var adContainer = document.createElement("div");
	
	var ad = msg.ad;
	if( typeof ad == "string" ){
		ad = JSON.parse(ad);
	}		
	
	adContainer.innerHTML = msg.html;
	
	adContainer = adContainer.childNodes[0];
	
	adContainer.className = "";
	adContainer.removeAttribute("id");
	
	adContainer.setAttribute("active", 1);	
	var iframe = adContainer.querySelector("iframe");
	
	for( var k in DEFAULT_CSS ){
		if( !(k in ad.css) ){
			ad.css[k] = DEFAULT_CSS[k];
		}							
	}
											
	if( ad.css ){
		var containerStyles = [];
		var frameStyles = [];
									
		for( var k in ad.css ){
			
			if( CONTAINER_STYLES.indexOf( k ) != -1 ){
				containerStyles.push( k+":"+ad.css[k] );	
			}
			else{
				frameStyles.push( k+":"+ad.css[k] );
			}
			
		}
		
		adContainer.setAttribute("style", containerStyles.join(";"));
		iframe.setAttribute("style", frameStyles.join(";"));
	}
	iframe.setAttribute("src", ad.frameUrl);
													
	var overlay = document.createElement("div");
	overlay.setAttribute("style", "position: absolute; left: 0px; top: 0px; right: 0px; bottom: 0px; z-index: 999999999999;");
	overlay.appendChild( adContainer );						
		
	overlay.addEventListener("click", function(){
		hideAD();
	}, false);	
	
	adContainer.addEventListener( "click", function( event ){
		event.stopPropagation();
		//event.preventDefault();
	}, false );
	
	adContainer.style.transitionDuration = "200ms";
	
	adContainer.style.opacity = 0;
	
	window.setTimeout(function(){
		adContainer.style.opacity = 1;
	}, 0);
	
	window.addEventListener("message", function( e ){
		
		if( e.data.a == "fvdsd:ad:ignore" ){
			chrome.runtime.sendMessage({
				a: "remoteAD:ignore",
				id: e.data.id
			});
		}
		else if( e.data.a == "fvdsd:ad:close" ){
			hideAD();
		}
		
	}, false);
	
	/*
	adContainer.querySelector(".dontShowAgain input").addEventListener( "click", function(){
		
		chrome.runtime.sendMessage({
			a: "remoteAD:ignore",
			id: ad.id
		});

		hideAD();
		
	}, false );
	*/												
	document.body.appendChild( overlay );	
	
});


console.log("Content script executed\n");
