var EXPORTED_SYMBOLS = ["fvd_speed_dial_ScreenMaker"]; 

const MAX_ACTIVE_GRABBERS = 1;
const FRAME_CONTAINER_ID = "fvd_speed_dial_ssd_grab_frames_container";
const MAX_FRAME_HEIGHT = 1240;
const MAX_SCREEN_HEIGHT = 1200;
const MAKE_SCREEN_TIMEOUT = 30; // 30 seconds
const MAX_IMAGE_WIDTH = 300;

const PAGE_SCREEN_PARAMS = {
	format: "image/jpeg",
	quality: 80
};

const IGNORE_LOAD_CONTENT_TYPES = [ "application/octet-stream" ];

Components.utils.import("resource://fvd.speeddial.modules/async.js");

_fvd_speed_dial_ScreenMaker = function(){
		
	var queue = [];
	var activeCount = 0;
	var nextIframeNum = 0;
	var self = this;
	
	this.saveToDir = "";
	
	function getMainWindow(){
		
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);  
		var mainWindow = wm.getMostRecentWindow("navigator:browser");  
		
		return mainWindow;		
		
	}
	
	function getFramesContainer(){
		
		var w = getMainWindow();
		var document = w.document;
		
		if( !document.getElementById(FRAME_CONTAINER_ID) ){
	        var parentHbox = document.createElement("hbox");
	        
			parentHbox.style.overflow = "hidden";	        
			parentHbox.style.maxHeight = "0px";
			parentHbox.style.height = "0px";			
	        
	        var hbox = document.createElement("hbox");
	        hbox.setAttribute("flex", "2");
	        hbox.setAttribute("id", FRAME_CONTAINER_ID);
	        hbox.style.minHeight = MAX_FRAME_HEIGHT + "px";
	        
	        parentHbox.appendChild(hbox);	        
			
	        document.documentElement.appendChild(parentHbox);

		}
	
		return document.getElementById(FRAME_CONTAINER_ID);
		
	}
	
	function saveUrlTo( url, fileName, callback ){
		var file = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties).get('ProfD', Components.interfaces.nsIFile);
		
		var subdirs = [];
		
		if( fileName.substring(0,1) == "/" ){
			fileName = fileName.substring(1);
			var tmp = fileName.split( "/" );
			if( tmp.length > 1 ){
				fileName = tmp.splice( tmp.length - 1, 1 )[0];
				subdirs = tmp;				
			}						
		}
		else{
			subdirs = self.saveToDir.split( "/" );
		}
		
		for( var i = 0; i != subdirs.length; i++ ){
			file.append(subdirs[i]);
			if (!file.exists()){
				file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, parseInt("0755", 8));
			}	    	
		}	

	    file.append(fileName);
		
	    var io = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
		    
	    var source = io.newURI(url, "UTF8", null);
	    var target = io.newFileURI(file)
	    
	    var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Components.interfaces.nsIWebBrowserPersist);
	    
	    persist.persistFlags = Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
	    persist.persistFlags |= Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
	    
		var listener = {
	        onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus){				
	            if (persist.currentState == 3) {
	            	callback();
	            }
	        }
	    }
		
	    persist.progressListener = listener;
		
		var privacyContext = null;
		
		try{
		
		    privacyContext = getMainWindow().QueryInterface(Components.interfaces.nsIInterfaceRequestor)
	                                 .getInterface(Components.interfaces.nsIWebNavigation)
	                                 .QueryInterface(nsILoadContext);
			
		}
		catch( ex ){
			
		}

	    // save the canvas data to the file
	    persist.saveURI(source, null, null, null, null, file, privacyContext);
	}
	
	var imageProcessor = function( screenData, imageProcessor_callback ){
		
		this.process = function(){
			var resultData = {};
			
			fvd_speed_dial_Async.chain( [
				function( cCallback ){
					var img = getMainWindow().document.createElementNS("http://www.w3.org/1999/xhtml", "img");
					img.onload = function(){
						resultData.result = true;
						
						var canvas = getMainWindow().document.createElementNS("http://www.w3.org/1999/xhtml", "html:canvas");
						
						var ctx = canvas.getContext('2d');
						
						var width = img.width;
						var height = img.height;
						
						if( screenData.originalSize ){
			
						}
						else{							
							width = img.width;
							height = img.height;
							
							if (width > MAX_IMAGE_WIDTH) {
								var width = MAX_IMAGE_WIDTH;
								var ratio = img.width / img.height;
								var height = Math.round(width / ratio);
							}						
						}						
	
						canvas.width = width;
						canvas.height = height;
						
						resultData.size = {
							width: width,
							height: height
						};
						
						ctx.drawImage( img, 0, 0, width, height );			
						
						resultData.canvas = canvas;
						
						cCallback();
					}
					
					img.onerror = function(){
						resultData.result = false;
						cCallback();						
					}
						
					img.src = screenData.imageUrl;
				},
				function( cCallback ){
					if( screenData.url ){
						screenData.noLoadImages = true;					
						var processor = new frameProcessor( screenData, function( frameResult ){
							resultData.title = frameResult.title;
							cCallback();
						} );
						processor.process();
					}
					else{
						resultData.title = null;
						cCallback();
					}
				},
				function(){
					imageProcessor_callback( resultData );
				}
			] );
			

		}
		
		
		
	}	
	
	var frameProcessor = function( screenData, frameProcessor_callback ){
		
		var countActiveRequests = 0;
		var iframe = null;
		var complete = false;
		var failed = false;
		var self = this;
		var callbackCalled = false;
		var timeoutTimer = null;		
		
		function isBlockedForLoad( aRequest ){
						
			var result = false;
			
			try{
				aRequest.QueryInterface( Components.interfaces.nsIHttpChannel );
			}
			catch( ex ){
				return false;
			}
			
			try{
				if( aRequest instanceof Components.interfaces.nsIHttpChannel ){		
							
					if( IGNORE_LOAD_CONTENT_TYPES.indexOf(aRequest.getResponseHeader( "Content-Type" )) !== -1 ){
						result = true;
					}
					//dump( aRequest.name + " : " + aRequest.getResponseHeader( "Content-Type" ) + "\n" );
				}	
			}
			catch( ex ){

			}			
			
			return result;
			
		}
		
		var httpRequestObserver =  {  
			observe: function(aRequest, topic, data){  
				if (topic == "http-on-examine-response") {  
					
					try{
						if( self.progressListener.activeRequestsInstances.indexOf( aRequest ) != -1 ){
							if( isBlockedForLoad( aRequest ) ){
								aRequest.cancel( Components.results.NS_BINDING_ABORTED );											
							}							
						}						
					}	
					catch( ex ){
						
					}			

					
				}  
			}  
		};  
		var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
		
		this.progressListener = {
			activeRequests: [],	
			activeRequestsInstances: [],
									
	        onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus){
				try{
					// restrart timeout if started
					if( (aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_TRANSFERRING) ){
						if(  aRequest.name != "about:document-onload-blocker" ){ // prevents onload blocker request(dont know what this mean, but this requests appears very active if content on page changes by JS without http loads data)
  	
							self._frameEventListener.restartTimeoutIfStarted();						
						}
					}
				}
				catch(ex){
					
				}

				
				if( aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_IS_REQUEST ){
					
					if( aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_START ){	
						
						this.activeRequests.push( aRequest.name );
						this.activeRequestsInstances.push( aRequest );
						countActiveRequests++;						
			
					}
					else if( aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_STOP ){	
						var	index = this.activeRequests.indexOf( aRequest.name );
						if( index != -1 ){
							countActiveRequests--;					
							this.activeRequests.splice( index, 1 );
						}
						else{
							//dump( "REQUEST " + aRequest.name + " not started("+this.stateFlagsToString( aStateFlags )+")\r\n" );
						}
						
						index = this.activeRequestsInstances.indexOf( aRequest.name );
						if( index != -1 ){		
							this.activeRequestsInstances.splice( index, 1 );
						}
					}
					else if( aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_REDIRECTING ){

					}
					else{
						
					}
					
				}
	
				
	            if (aStatus != 0 /*Components.results.NS_ERROR_UNKNOWN_HOST*/) {
	                var goodStatuses = [Components.interfaces.nsISocketTransport.STATUS_RESOLVING,
										Components.interfaces.nsISocketTransport.STATUS_RESOLVED,
										Components.interfaces.nsISocketTransport.STATUS_CONNECTING_TO,
										Components.interfaces.nsISocketTransport.STATUS_CONNECTED_TO,
										Components.interfaces.nsISocketTransport.STATUS_SENDING_TO,
										Components.interfaces.nsISocketTransport.STATUS_WAITING_FOR,
										Components.interfaces.nsISocketTransport.STATUS_RECEIVING_FROM,
										Components.results.NS_BINDING_ABORTED,
										2153578529 // NOT documented. appears where loading images.
										];
	                if (goodStatuses.indexOf(aStatus) == -1) {
						// if main request - is failed					
						if( aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_IS_WINDOW ||
							aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_IS_DOCUMENT ){	    	                
		                    aRequest.cancel(0);			
							fail();			
						}	
	                }
	            }
				
				
	        },
			
			onStatusChange: function(aWebProgress, aRequest, aStatus, aMessage){

			},
			onLocationChange: function(){
				
			},
			onSecurityChange: function(){
				
			},
	  
	        onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress){	

				if( aMaxTotalProgress < 1 ){
					return;
				}					

				progressCallback(aCurTotalProgress, 1048576/2); // one page is 0.5 MB				
	        },

	        QueryInterface: function(aIID){
	            if (aIID.equals(Components.interfaces.nsIWebProgressListener) || aIID.equals(Components.interfaces.nsISupportsWeakReference) || aIID.equals(Components.interfaces.nsISupports)) 
	                return this;
	            throw Components.results.NS_NOINTERFACE;
	        }
	        
	    };
		
		this._frameEventListener = {
			grabberInstance: null,
			loadObtained: true, // test for load obtained always true
			finishTimeout: null,
			
			timerListener: {
				_frameEventListener: null,
				observe: function(subject, topic, data) {  					
					if( countActiveRequests != 0 ){	
						self._frameEventListener.startTimeout();
						return;
					}
					
					if( iframe ){
						complete = true;
						finish();				
					}
					else{

					}				
					
				}  
			},
			
	        QueryInterface: function(aIID){
	            if (aIID.equals(Components.interfaces.nsIDOMEventListener) ||
		            aIID.equals(Components.interfaces.nsIWebProgressListener) ||
		            aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
		            aIID.equals(Components.interfaces.nsISupports)) {
	                return this;				
				}
				
	
	            throw Components.results.NS_NOINTERFACE;
	        },
			
			restartTimeoutIfStarted: function(){
				if(this.finishTimeout){
					this.startTimeout();
				}
			},
			
			startTimeout: function(){
				if( complete ){
					return false;
				}	
				
				if( !this.timerListener._frameEventListener ){
					this.timerListener._frameEventListener = this;
				}
				
				
				if (this.finishTimeout) {
					try{
						this.finishTimeout.cancel();
						this.finishTimeout = null;
					}
					catch(ex){
						
					}
				}
				
				this.finishTimeout = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);  				  
				this.finishTimeout.init(this.timerListener, screenData.delay * 1000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);  
			},
			
			handleEvent: function( event ){
				if( event.type == "load" ){					
					this.loadObtained = true;
				}
				else if( event.type == "pageshow" ){
					if( this.loadObtained ){
						// finished
						this.startTimeout();	
					}
				}
			}
	    }
		
		function progressCallback( total, max ){
			if( screenData.onProgress ){
				try{
					screenData.onProgress( total, max );					
				}
				catch( ex ){
					
				}
			}
		}
		
		function cleanup(){
			try{
				iframe.parentNode.removeChild( iframe );
			}
			catch( ex ){
				dump( ex + " while clean up \n" );
			}			
			
			try{
				observerService.removeObserver( httpRequestObserver, "http-on-examine-response" );
			}
			catch( ex ){
				
			}			
		}
		
		
		function getTitleOfFrame(){
			var remoteDoc = iframe.contentDocument.documentElement;
			
			var title = null;
			
			if (remoteDoc.title) {
				title = remoteDoc.title;
			}
			else if (iframe.contentDocument.title) {
				title = iframe.contentDocument.title;
			}
			
			return title;
		}
		
		function fail(){
			if( callbackCalled ){
				return;
			}			
			callbackCalled = true;
			
			frameProcessor_callback({
				title: getTitleOfFrame(),
				result: false
			});
			
			cleanup();
		}
		
		function finish(){						
			if( callbackCalled ){
				return;	
			}
			callbackCalled = true;

			try{
				var document = getMainWindow().document;
				var remoteWindow = iframe.contentWindow;
				var remoteDoc = iframe.contentDocument.documentElement;
				var body = iframe.contentDocument.body;
				
				if( !body ){
					body = {
						scrollHeight: 0
					};
				}
				
				var canvas = document.createElementNS("http://www.w3.org/1999/xhtml", "html:canvas");
				
				var windowWidth = remoteDoc.scrollWidth;
				
				var windowHeight = 0;
												
				windowHeight = Math.max( body.scrollHeight, remoteDoc.scrollHeight );
				
				if( windowHeight == 0 ){
					windowHeight = remoteWindow.innerHeight;
				}
				
				if( windowHeight == 0 ){
					windowHeight = MAX_SCREEN_HEIGHT;
				}
				
				if (windowHeight > MAX_SCREEN_HEIGHT) {
					windowHeight = MAX_SCREEN_HEIGHT;
				}
				
				var ratio = windowWidth / windowHeight;
				
				var canvasWidth = 400;
				var canvasHeight = canvasWidth / ratio;
				
				canvas.width = canvasWidth;
				canvas.height = canvasHeight;
				
				var ctx = canvas.getContext("2d");
				ctx.mozImageSmoothingEnabled = true;
				ctx.clearRect(0, 0, windowWidth, windowHeight);
				ctx.save();
				ctx.scale(canvasWidth / windowWidth, canvasHeight / windowHeight);
				
				try {
					ctx.drawWindow(remoteWindow, 0, 0, windowWidth, windowHeight, "rgb(255,255,255)");
				} 
				catch (ex) {

				}
				
				ctx.restore();				
				
				frameProcessor_callback({
					title: getTitleOfFrame(),
					canvas: canvas,
					result: true				
				});	
				
				cleanup();	
			}
			catch( ex ){
				dump( "EXCEPTION: " + ex + "\n" );
				fail();
			}
				
		}
		
		
		
		this.process = function(){
			
			observerService.addObserver( httpRequestObserver, "http-on-examine-response", false );
				
			var frameNum = nextFrameNum();
			var frameId = frameIdByNum( frameNum );
			
			var document = getMainWindow().document;
			
	        iframe = document.createElement("browser");
	        iframe.setAttribute("type", "content");
	        		
			iframe.setAttribute("id", frameId);
			
	        iframe.setAttribute("height", 10);
			
	        iframe.style.maxWidth = "1024px";
	        iframe.style.minWidth = "1024px";
	        
	        iframe.style.visibility = "hidden";
			
			iframe.addEventListener("load", this._frameEventListener, true);        
	        iframe.addEventListener("pageshow", this._frameEventListener, true);
	        iframe.addEventListener("pageshow", this._frameEventListener, true);
			iframe.addEventListener("pagehide", this._frameEventListener, true);
	
			iframe.addEventListener("unload", this._frameEventListener, true);
			iframe.addEventListener("DOMLinkAdded", this._frameEventListener, true);
			
			iframe.setAttribute("src", screenData.url);
			
			getFramesContainer().appendChild( iframe );
			
	        iframe.docShell.allowJavascript = screenData.enableJs;
	       	iframe.docShell.allowPlugins = !screenData.disablePlugins;
	        iframe.docShell.allowAuth = false;
	        iframe.docShell.allowImages = !screenData.noLoadImages;			
			
			
			iframe.addProgressListener(this.progressListener);	
											
			timeoutTimer =	Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);	
			timeoutTimer.initWithCallback({
				notify: function(){
					finish();
				}
			} , MAKE_SCREEN_TIMEOUT * 1000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);	
		}
		
	}	
	
	function next(){
		
		if( activeCount >= MAX_ACTIVE_GRABBERS ){
			return;
		}
		
		if( queue.length > 0 ){
			var screenData = queue.shift();			
			process( screenData );
		}
		
	}

	function getDataUrl( screenData, resultData, params ){
		
		params = params || {};
		params.format = params.format || "image/png";
		params.quality = params.quality || 100;			
		
		var ouputFormat = params.format;
		var quality = params.quality;
		
		if(screenData.saveFormat){
			if( screenData.saveFormat == "asis" ){
				// try to get format by url
				if( screenData.imageUrl ){
					var url = screenData.imageUrl.toLowerCase();
					
					if( url.indexOf(".png") != -1 ){
						ouputFormat = "image/png";
					}
					else if( url.indexOf(".jpg") != -1 || url.indexOf(".jpeg") != -1 ){
						ouputFormat = "image/jpeg";						
					}
				}
			}
			else{
				ouputFormat == screenData.saveFormat;				
			}
		}		


		try{
			return resultData.canvas.toDataURL( ouputFormat, quality );							
		}
		catch( ex ){

			
			return resultData.canvas.toDataURL( "image/png" );											

		}

	}
	
	function process( screenData ){
		
		activeCount++;
		
		function success( resultData ){	
			
			var dataUrl = getDataUrl( screenData, resultData, screenData.type == "url" ? PAGE_SCREEN_PARAMS : null );
			
			if( screenData.fileName ){
				saveUrlTo( dataUrl, screenData.fileName, function(){
					try{
						screenData.onSuccess( resultData );						
					}
					catch( ex ){
		
					}

				} );
			}
			else{
				resultData.dataURL = dataUrl;
				try{
					screenData.onSuccess( resultData );					
				}
				catch( ex ){
					
				}
			}
			
			activeCount--;	
			next();	
		}
		
		function fail( resultData ){
			if( screenData.onFail ){
				try{
					screenData.onFail( resultData );					
				}
				catch( ex ){
					
				}
			}	
			
			activeCount--;	
			next();			
		}
		
		if( screenData.type == "url" ){
			var processor = new frameProcessor( screenData, function( resultData ){
				if( resultData.result ){
					
					success( resultData );
								
				}
				else{
					fail( resultData );				
				}						
			} );
			
			processor.process();	
		}
		else if( screenData.type == "image" ){
			var processor = new imageProcessor( screenData, function( resultData ){
				if( resultData.result ){					
					success( resultData );								
				}
				else{
					fail( resultData );				
				}						
			} );
			
			processor.process();	
		}
		
		
	}
	
	function nextFrameNum(){
		return nextIframeNum++;
	}
	
	function frameIdByNum( num ){
		return "fvd_speed_dial_grab_frame_"+num;
	}
	
	this.make = function(screenData){
		process( screenData );
	}
	
	this.shedule = function( screenData ){	
		queue.push( screenData );
		next();			
	}
	
}

fvd_speed_dial_ScreenMaker = new _fvd_speed_dial_ScreenMaker();
