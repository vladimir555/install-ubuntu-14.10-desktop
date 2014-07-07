var EXPORTED_SYMBOLS = ["fvd_speed_dial_RemoteAD"]; 

const UPDATE_AD_INTERVAL = 24 * 3600 * 1 * 1000; // 7 days
const AD_URL = "https://s3.amazonaws.com/fvd-special/remotead/fvdsd_ff2.json";

//const AD_URL = "https://s3.amazonaws.com/fvd-special/remotead/fvdsd_chrome2.json";

const USE_CACHE = true;
const CONTENT_SCRIPT_LOCATION = "resource://fvd.speeddial.modules/remotead_cs.js";

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

var console = {
	log: function(){
		var args = Array.prototype.slice.call( arguments );
		
		dump( "REMOTEAD: " + args.join(",") + "\n" );
	},
	
	warn: function(){
		var args = Array.prototype.slice.call( arguments );
		
		dump( "REMOTEAD WARNING: " + args.join(",") + "\n" );
	}	
};


if( !USE_CACHE ){
	console.warn("Use REMOTEAD without cache!");
}


Components.utils.import("resource://fvd.speeddial.modules/properties.js");
var messages = {
	donotdisplay: fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "sd.alert.dont_show_again") //_("newtab_do_not_display_migrate")
};

var branch = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getBranch("intl.");

var supportedLanguages = branch.getCharPref( "accept_languages" ).split(",");


var adHTML = '<div>'+
	'<iframe></iframe>'+
'</div>';


var _Chrome = function( sendMessageListener ){
	
	this.__exposedProps__ = {
		extension: "r",
		runtime: "r"
	};
	
	this.runtime = new function(){
		
		this.__exposedProps__ = {
			onMessage: "r",
			sendMessage: "r"
		};
		
		this.onMessage = new function(){
			
			var listeners = [];
			
			this.addListener = function( callback ){				
				listeners.push( callback );				
			};
			
			this.callListeners = function(msg){				
				var args = arguments;
				
				msg.__exposedProps__ = {};
				
				for( var k in msg ){
					msg.__exposedProps__[k] = "r";
				}
				
				listeners.forEach(function( listener ){
					listener(msg);
				});
			};
			
			this.__exposedProps__ = {
				addListener: "r"
			};
			
		};
		
		this.sendMessage = function( message, callback ){
			
			sendMessageListener( message, callback );
			
		};
		
	};
	
};


function readFileByUrl( url, callback ){
	
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
	
    req.open("GET", url);
    req.onload = function(event){
		
        callback(req.responseText);
		
    };
    req.overrideMimeType("text/plain");
    req.send(null);
	
}

function cloneObj( obj ){
	return JSON.parse( JSON.stringify( obj ) );
}

function hasEqualElements(a, b){	
	a = a.map(function( s ){
		return s.toLowerCase();
	});
	
	b = b.map(function( s ){
		return s.toLowerCase();
	});
			
	for( var i = 0; i != a.length; i++ ){
		if( b.indexOf( a[i] ) != -1 ){
			return true;
		}
	}
	
	return false;		
}

/*main*/

var RemoteAdClass = function(){
	
	var prefs = null;
	var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);	
	var observer = Components.classes['@mozilla.org/observer-service;1'].getService(Components.interfaces.nsIObserverService);	
	var contentScriptCode = "";	
	var self = this;
		
	var storage = new function(){
		function _k( k ){
			return "__remotead." + k;
		}		
		this.set = function( k, v ){
		  if(prefs){
		    prefs.setCharPref(_k(k), v);  
		  }				
		};
		this.get = function( k ){
			try{
				return prefs.getCharPref(_k(k));	
			}
			catch( ex ){
				return null;
			}			
		};
	};
	
	/* window listener */
	
	var windowListener = {
	    onOpenWindow: function(aWindow){
	        // Wait for the window to finish loading
	        var domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
	        domWindow.addEventListener("load", function(){
	            domWindow.removeEventListener("load", arguments.callee, false);
				
	            listenWindow(domWindow);
				
	        }, false);
	    },
	    
	    onCloseWindow: function(aWindow){
	    },
	    onWindowTitleChange: function(aWindow, aTitle){
	    }
	};
		
	function listenWindow( window ){
		
		if( !window || !window.document || !window.document.getElementById || !window.document.getElementById( "appcontent") ){
			return;
		}
		
		window.document.getElementById( "appcontent" ).addEventListener("DOMContentLoaded", domLoadedCallback, true);
				
	}
	
	function unlistenWindow( window ){
		
		if( !window || !window.document || !window.document.getElementById || !window.document.getElementById( "appcontent") ){
			return;
		}
		
		window.document.getElementById( "appcontent" ).removeEventListener("DOMContentLoaded", domLoadedCallback, true);
		
	}	
	
	function injectScript( win, ad ){
		
		var document = win.document;
		
		var sandbox = new Cu.Sandbox( win ); 
		sandbox.window = win;
		sandbox.document = document;
		sandbox.console = new function(){
			this.log = function( text ){
				dump( text + "\n" );
			};
			
			this.__exposedProps__ = {
				log: "r"
			};
		};
		
		var chromeImitation = new _Chrome(function( message, callback ){
	
			if( message.a == "remoteAD:ignore" ){
				self.ignoreAd( message.id );
			}
			else if( message.a == "remoteAD:close" ){
				
				observer.notifyObservers(null, "FVD.RemoteAD.close", message.id);	
				
			}
			
		});
		
		sandbox.chrome = chromeImitation;
				
		Components.utils.evalInSandbox(contentScriptCode, sandbox, "1.8", "remotead.js", 1);	
		
		if( ad ){
			chromeImitation.runtime.onMessage.callListeners({
				a: "fvd:remotead:show",
				ad: JSON.stringify( ad ),
				html: adHTML
			});	
		}		
				
	}
	
	function domLoadedCallback( e ){
		
		var win = e.target.defaultView;
	    if (win.wrappedJSObject){
			win = win.wrappedJSObject;				
		}
		
		if (win != win.top) {
			// in frame
			injectScript(win);
			return;
		}
		
		var document = win.document;
		
		var host = document.location.host.toLowerCase().replace(/^www\./, "");
		
		if( !host ){
			return;
		}
		
		dump("!Check ad for host: " + host + "\n");
						
		getADToShow({
			host: host
		}, function( ad ){
			
			dump("AD for " + host + " is " + ad + "\n");
			
			if( ad ){
				
				injectScript( win, ad );
					
			}
			
		});
		
	}		
		
	function getUrlContents( url, callback ){
		var xhr = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
		xhr.open( "GET", url );
		xhr.onload = function(){
			callback( xhr.responseText );
		};
	
		xhr.send( null );
	}
		
	var _isFirstStart = null;
	
	function cacheTTL( cache ){
		return new Date().getTime() - cache.createDate;
	}		
	
	function getADList( params, callback ){
		
		var cache = storage.get("adcache");
		
		var now = new Date().getTime();
								
		if( USE_CACHE && cache ){
			try{
				cache = JSON.parse(cache);
				
				if( cacheTTL(cache) > 0 ){
					console.log("CACHE!");
																	
					return callback( cache.data );
				}
			}
			catch( ex ){
				
			}				
		}
		
		getUrlContents( AD_URL + "?c=" + (new Date().getTime()), function( text ){
			
			console.log(text);
			
			var data = JSON.parse(text);
			
			console.log("Obtained AD from url", data);
			
			var cache = {
				createDate: new Date().getTime(),
				data: data
			};
			
			storage.set( "adcache", JSON.stringify( cache ) );
			
			callback( data );
			
		} );
		
	}
	
	function isFirstStart(){
		
		if( _isFirstStart === null ){
			
			if( !storage.get("firstStartCompleted") ){
				_isFirstStart = true;
				storage.set("firstStartCompleted", true);
			}
			else{
				_isFirstStart = false;
			}
			
			console.log("Is first start?", _isFirstStart);

		}
		
		return _isFirstStart;
		
	}
	
	function canDisplayAD( ad ){
		
		var now = new Date().getTime();
	
		if( ad.languages ){
			if( !hasEqualElements( ad.languages, supportedLanguages ) ){
				console.log("Language not supported", ad.languages,", not in list of ", supportedLanguages);
				return false;
			}
		}
		
		if( ad.newUserDelay ){
			
			var obtainedTime = parseInt( storage.get( "ad.obtained_time." + ad.id ) );
							
			if( obtainedTime ){
				if( now - obtainedTime < ad.newUserDelay * 3600 * 1000 ){
					console.log("Delay is active");
					
					return false;
				}
			}
			else if( isFirstStart() ){
				storage.set( "ad.obtained_time." + ad.id, now );
				
				console.log("Need to wait delay for first start", ad.newUserDelay);
				
				return false;
			}
			
		}
		
		var adIgnored = !!parseInt( storage.get( "ad.ignored." + ad.id ) );
			
		if( adIgnored ){
			console.log("AD is ignored by user");
			
			return false;
		}
		
		return true;
		
	}
	
	function getADToShow( params, callback ){
		
		if( typeof params == "function" ){
			callback = params;
			params = {};
		}
		
		getADList( null, function( ads ){
			
			for( var i = 0; i != ads.length; i++ ){
				var ad = ads[i];
				
				console.log( "Check", ad.id );
				
				if( params.nohosts && ad.hosts && ad.hosts.length > 0 ){
					continue;
				}
				
				if( params.host && ( !ad.hosts || ad.hosts.indexOf( params.host ) == -1 ) ){
					continue;
				}
			
				if( canDisplayAD( ad ) ){
					ad = cloneObj( ad );
					
					ad.frameUrl += "?id=" + encodeURIComponent( ad.id );
					
					callback( ad );
					return;
				}
				else{
					console.log("Can't show");
				}
			}
			
			callback( null );
			
		} );
		
	}	
	
	this.ignoreAd = function( adId ){
		storage.set( "ad.ignored." + adId, 1 );
	};
	
	this.getADToShow = function(){
		
		return getADToShow.apply( this, arguments );
		
	};
	
	this.init = function( aPrefs ){
		prefs = aPrefs;
		
    	wm.addListener(windowListener);
		
	    var windows = wm.getEnumerator("navigator:browser");
		
	    while (windows.hasMoreElements()) {
	        var domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
	        listenWindow(domWindow);
	    }			
	    
	    readFileByUrl( CONTENT_SCRIPT_LOCATION, function( text ){
	    	contentScriptCode = text;
	    } );
	};
	
	
};

fvd_speed_dial_RemoteAD = new RemoteAdClass();	


