var EXPORTED_SYMBOLS = ["fvd_speed_dial_GoogleLinks"]; 

Components.utils.import("resource://fvd.speeddial.modules/misc.js");
Components.utils.import("resource://fvd.speeddial.modules/properties.js");
Components.utils.import("resource://fvd.speeddial.modules/storage.js");
Components.utils.import("resource://fvd.speeddial.modules/settings.js");

fvd_speed_dial_GoogleLinks = {
	instances: [],
	
	start: function( window ){
		
		var instance = new _fvd_speed_dial_GoogleLinks( window.gBrowser );
		instance.start();
		this.instances.push( instance );
		
		var that = this;
		
		window.addEventListener( "unload", function(){			
			// cleanup
			try{
				var index = null;
				for( var i = 0; i != that.instances.length; i++ ){
					if( instance == that.instances[i] ){
						index = i;
						break;
					}
				}				
				
				if( index !== null ){
					that.instances.splice( index, 1 );
				}
			}
			catch( ex ){
				
			}

		}, false );
		
	}
}

_fvd_speed_dial_GoogleLinks = function( gBrowser ){
	
	var fvdSpeedDialMain = null;
	var self = this;
	
	const fvdSpeedDialElemClassName = "fvd-speed-dial-add-to-speed-dial";
	const cssPath = "chrome://fvd.speeddial/skin/external/google_links.css";
			
	this.gBrowser = gBrowser;
	
    var prefListener = {
        observe: function(aSubject, aTopic, aData){
            switch (aTopic) {
                case 'nsPref:changed':
					                    
                    if (aData == "display_button_in_google_results") {
                        refreshListenerState();
                    }
                    
                    break;
            }
        }
    };
    
	function refreshListenerState(){
		
		try{
			self.gBrowser.removeEventListener("load", loadListener, true);			
		}
		catch( ex ){
			
		}
		
		
		if( fvd_speed_dial_gFVDSSDSettings.getBoolVal("display_button_in_google_results") ){
			self.gBrowser.addEventListener("load", loadListener, true);		
		}			
		
	}
	
			
	function loadListener( event ){
			
		try{
			var location = event.target.location.host;			
			
			if( location.indexOf( "google." ) == -1 ){
				return;
			}
			
		}
		catch( ex ){
			return;	
		}
		
			
		var window = event.target.defaultView;
		var document = event.target;
		
		var prevQuery = null;
		
		var queryEdit = document.getElementById("gbqfq");
		
		if( !queryEdit ){
			return;
		}
		
		
		// inject css
		var css = document.createElement( "style" );
		css.textContent = fvd_speed_dial_Misc.getUrlContents( cssPath );
		document.head.appendChild( css );
		
		var interval = window.setInterval( function(){
				
			try{
				var blocks = document.getElementById("res").querySelectorAll( "li.g" );				
			}
			catch( ex ){
				return;			
			}
			
			
			if( blocks.length == 0 ){
				return;
			}
			
			for( var i = 0; i != blocks.length; i++ ){
				try{
					var block = blocks[i];
					
					if( block.querySelector( "."+fvdSpeedDialElemClassName ) ){
						continue;
					}
					
					var a = block.querySelector( "a.l,h3.r > a" );	
					var url = a.getAttribute( "href" );
					var title = a.textContent;
					
					var greenLineDiv = block.querySelector( "div.f.kv" );
					
					var sdElem = document.createElement( "button" );
					sdElem.className = fvdSpeedDialElemClassName + " esw";
					sdElem.setAttribute( "title", fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "google_links.add_to_speeddial" ) );
					
					sdElem.style.display = "none"; // hide. first need check this url already exists in database, if not - we will show.
					
					(function( url, title, sdElem ){
						
						sdElem.addEventListener( "click", function( event ){
							
							if( event.button == 0 ){
								
								fvdSpeedDialMain.createNewDial( url, title, null, null, {
									onSuccess: function(){
										sdElem.style.display = "none";
									}									
								} );
								
							}
						}, false );
						
					})( url, title, sdElem );
					
					greenLineDiv.appendChild( sdElem );
					
					(function( url, sdElem ){
						fvd_speed_dial_Storage.urlExistsAsync( url, function( exists ){
							
							if( !exists ){
								
								sdElem.style.display = "";
								
							}
							
						} );						
					})( url, sdElem );
					
					
									
				}
				catch( ex ){
				
				}				
			}
			
		}, 1000 );	
	}
	
	
	
	this.start = function(){
		try{
			fvd_speed_dial_gFVDSSDSettings.addObserver(prefListener);
			
			fvdSpeedDialMain = self.gBrowser.ownerDocument.defaultView.fvd_speed_dial_speedDialSSD;		
			
			refreshListenerState();	
		}
		catch( ex ){
			
		}
	}
	
}
