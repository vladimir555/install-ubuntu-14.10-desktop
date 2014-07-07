Components.utils.import("resource://fvd.speeddial.modules/remotead.js");

(function(){
	
	const DEFAULT_CSS = {
		"border": "none"
	};
	const CONTAINER_STYLES = [
		"top",
		"left",
		"right",
		"bottom"
	];
	
	var displayedAd = null;
	
	var observer = Components.classes['@mozilla.org/observer-service;1'].getService(Components.interfaces.nsIObserverService);	
	
	var observerStruct = {
	    observe: function(aSubject, aTopic, aData){
			
			switch (aTopic) {
				case 'FVD.RemoteAD.close':
					
					if( aData == displayedAd.id ){
						HtmlSearch.hideOptions();
					}
					
				break;								
			}
		}
	};
	
	observer.addObserver(observerStruct, "FVD.RemoteAD.close", false);	
	
	window.addEventListener("unload", function(){
		
		observer.removeObserver(observerStruct, "FVD.RemoteAD.close", false);	
		
	}, false)
	
	setTimeout(function(){
		
		fvd_speed_dial_RemoteAD.getADToShow({ nohosts: true }, function( ad ){
			
			if( ad ){
				
				var adContainer = document.getElementById("remoteADPopup");	
				var iframe = adContainer.querySelector("iframe");
				
				for( var k in DEFAULT_CSS ){
					if( !(k in ad.css) ){
						ad.css[k] = DEFAULT_CSS[k];
					}							
				}
				
				adContainer.removeAttribute("style");
				iframe.removeAttribute("style");
				
				displayedAd = ad;
													
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
					
									
				HtmlSearch.showOptions( "remoteADPopup", null, null, null, function(){
					
				
					
				} );				
				
			}
			
		});
		
	}, 3000);
	
})();

