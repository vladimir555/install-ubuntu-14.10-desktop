var SpeedDialSSDPageGrabberMisc = {
	SD_PAGE_GRABBER_MAX_FRAME_HEIGHT: 1240,
	
    clearFrames: function(){
        var container = this.container();
        if (container) {
            while (container.firstChild) {
                container.firstChild.stop();
                container.removeChild(container.firstChild);
            }
        }
    },
    container: function(){		
        var hbox;
        if (!(hbox = fvd_speed_dial_gFVDSSD.document().getElementById("grab_frames_container"))) {
            var parentHbox = document.createElement("hbox");
            parentHbox.style.overflow = "hidden";
            parentHbox.style.maxHeight = "0px";
            
            var hbox = document.createElement("hbox");
            hbox.setAttribute("flex", "2");
            hbox.setAttribute("id", fvd_speed_dial_gFVDSSD.SD_FRAME_CONTAINER_ID);
            hbox.style.minHeight = this.SD_PAGE_GRABBER_MAX_FRAME_HEIGHT + "px";
            
            parentHbox.appendChild(hbox);
            
            fvd_speed_dial_gFVDSSD.document().documentElement.appendChild(parentHbox);
        }
        
        return hbox;
    }
}

/*
 * fileName - if use grabType = "save_file"
 */
var SpeedDialSSDPageGrabber = function(pageUrl, fileName){

	this.destroyed = false; 

    this.frameId = null;
	this.obtainFrameIdTimeoutDuration = 1000;//one second
	this.obtainFrameIdTimeout = null;
	this.timeout = 30;// loading site page timeout(seconds)
    this.startTime = 0;// start work time
	
	
    this.maxScreenShotHeight = 1200;
    
	this.delay = 2; //2 seconds page load delay default
    
	this.progressCallback = null,
	
    this.pageUrl = pageUrl;
    this.fileName = fileName;
    this.callback = null;
    this.title = null; //title of document
    this.failed = false;
	this.noGrabTitle = false;
	
	this._fvdInst = fvd_speed_dial_gFVDSSD;	
	
    this.forceScreen = null; // if specified must contains url to image, we save not canvas data, only this image
    this.forceScreenNoTitle = false; // no grab title in force screen mode
    this.forceScreenMaxWidth = 300; 
	
    this.enableJs = true; // enable JS in grabbed page, default - enabled
   	this.disablePlugins = true; // disable plugins(flash, silverlight)
    this.grabType = "save_file", // allow save_file - file saved to lcal directory, get_image_url - callback only obtains url to page screen
    
    this.waitGrabQueueId = null;
		
	this.saveCanvasCallback = null; // custom canvas saving	
	
	
	this.resultSize = {witdh: null, height: null}, // size of result thumbnail
	
	
	this.startTimeoutChecker = function(){
		this.startTime = (new Date()).getTime();
		this._startTimeoutChecker();
	}
	
	this._startTimeoutChecker = function(){
		var inst = this;
		
		this.finishTimeout = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);  				  
		this.finishTimeout.init({observe:function(){
			
			var now = (new Date()).getTime();
			var elapsed = (now - inst.startTime)/1000;
			
			if( inst.destroyed ){
				return;
			}
			
			if( inst.timeout != 0 && elapsed > inst.timeout ){
				// try to stop frame loading
				try{
					this._frame.stop();					
				}
				catch( ex ){
					
				}
				// try to run callback
				try{
					inst._callbackLoaded.call(inst);							
				}
				catch( ex ){
					
				}

				return;			
			}
			

			
			inst._startTimeoutChecker();
			
		}}, 1000 /* every second */, Components.interfaces.nsITimer.TYPE_ONE_SHOT);  
	}
	
 	this.progressListener = {
        inst: null,
		
		activeRequestsCount: 0,
		activeRequests: [],
		
		
		stateFlagsToString: function(aStateFlags){
			var wpl = Components.interfaces.nsIWebProgressListener;
			var strings = [];
			if( aStateFlags & wpl.STATE_START ){
				strings.push( "STATE_START" );
			}
			if( aStateFlags & wpl.STATE_REDIRECTING ){
				strings.push( "STATE_REDIRECTING" );
			}
			if( aStateFlags & wpl.STATE_TRANSFERRING ){
				strings.push( "STATE_TRANSFERRING" );
			}
			if( aStateFlags & wpl.STATE_STOP ){
				strings.push( "STATE_STOP" );
			}
			
			if( aStateFlags & wpl.STATE_IS_REQUEST ){
				strings.push( "STATE_IS_REQUEST" );
			}
			if( aStateFlags & wpl.STATE_IS_DOCUMENT ){
				strings.push( "STATE_IS_DOCUMENT" );
			}
			if( aStateFlags & wpl.STATE_IS_NETWORK ){
				strings.push( "STATE_IS_NETWORK" );
			}
			if( aStateFlags & wpl.STATE_IS_WINDOW ){
				strings.push( "STATE_IS_WINDOW" );
			}
			if( aStateFlags & wpl.STATE_RESTORING ){
				strings.push( "STATE_RESTORING" );
			}
			
			return strings.join(" ");
		},
		
		requestLoadFlags: function( flags, request ){
			var strings = [];
			if( flags & request.LOAD_FROM_CACHE ){
				strings.push( "LOAD_FROM_CACHE" );
			}
			if( flags & request.LOAD_BYPASS_CACHE ){
				strings.push( "LOAD_BYPASS_CACHE" );
			}
			if( flags & request.INHIBIT_CACHING ){
				strings.push( "INHIBIT_CACHING" );
			}
			if( flags & request.INHIBIT_PERSISTENT_CACHING ){
				strings.push( "INHIBIT_PERSISTENT_CACHING" );
			}
			if( flags & request.LOAD_BACKGROUND ){
				strings.push( "LOAD_BACKGROUND" );
			}
			if( flags & request.LOAD_NORMAL ){
				strings.push( "LOAD_NORMAL" );
			}
			
			return strings.join( " " );
		},
		
        onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus){
			try{
				// restrart timeout if started
				if( (aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_TRANSFERRING) ){
					if(  aRequest.name != "about:document-onload-blocker" ){ // prevents onload blocker request(dont know what this mean, but this requests appears very active if content on page changes by JS without http loads data)
			        	//dump( "\r\nChange state ("+aRequest.name+") :\r\n" + this.stateFlagsToString( aStateFlags )+", ("+this.requestLoadFlags(aRequest.loadFlags, aRequest)+")\r\n\r\n" );
						this.inst._frameEventListener.restartTimeoutIfStarted();						
					}
				}
			}
			catch(ex){
				
			}
			
			if( aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_IS_REQUEST ){
				
				if( aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_START ){		
					//dump( "START("+aRequest.name.substr(0,30)+"): " + this.stateFlagsToString( aStateFlags ) + "\r\n" );
						
					this.activeRequests.push( aRequest.name );
					this.activeRequestsCount++;
				}
				else if( aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_STOP ){	
					//dump( "STOP("+aRequest.name.substr(0,30)+"): " + this.stateFlagsToString( aStateFlags ) + "\r\n" );
					
					var	index = this.activeRequests.indexOf( aRequest.name );
					if( index != -1 ){
						this.activeRequestsCount--;					
						this.activeRequests.splice( index, 1 );
					}
					else{
						//dump( "REQUEST " + aRequest.name + " not started("+this.stateFlagsToString( aStateFlags )+")\r\n" );
					}
				}
				else if( aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_REDIRECTING ){
					//dump( "REDIRECT("+aRequest.name.substr(0,30)+"): " + this.stateFlagsToString( aStateFlags ) + "\r\n" );
					
					//this.activeRequests.push( aRequest.name );
					//this.activeRequestsCount++;
				}
				else{
				//	dump( "STATE: " + this.stateFlagsToString( aStateFlags ) + "\r\n" );
				}
				
//				dump( "REQUEST " + this.activeRequestsCount + "()\r\n" );
			}			
						

			
			
		
            if (aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_STOP) {
                if (aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_IS_WINDOW) {
					//dump( "Loaded by listener\r\n" );
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
    	                this.inst.failed = true;
	                    aRequest.cancel(0);						
					}	
                }
            }
			
			
        },
        
        onLocationChange: function(aWebProgress, aRequest, aURI){
        
        },
        onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress){	
			if( aMaxTotalProgress < 1 ){
				return;
			}					
			if( this.inst.progressCallback ){
				this.inst.progressCallback(aCurTotalProgress, 1048576/2); // one page is 0.5 MB
			}
        },
        onStatusChange: function(aWebProgress, aRequest, aStatus, aMessage){

        },
        onSecurityChange: function(aWebProgress, aRequest, aState){
		
        },
        onLinkIconAvailable: function(){
			
        },
        QueryInterface: function(aIID){
            if (aIID.equals(Components.interfaces.nsIWebProgressListener) || aIID.equals(Components.interfaces.nsISupportsWeakReference) || aIID.equals(Components.interfaces.nsISupports)) 
                return this;
            throw Components.results.NS_NOINTERFACE;
        }
        
    };
    
	// save file to FVD Toolbar dir
	this.saveFile = function( url, fileName ){
	    var file = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties).get('ProfD', Components.interfaces.nsIFile);
	    file.append(fvd_speed_dial_speedDialSSD.STORAGE_FOLDER);
	    
	    if (!file.exists()) 
	        file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, parseInt("0755", 8));
	    
	    file.append(fileName);
	    
	    // create a data url from the canvas and then create URIs of the source and targets  
	    var io = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
		    
	    var source = io.newURI(url, "UTF8", null);
	    var target = io.newFileURI(file)
	    
	    // prepare to save the canvas data
	    var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Components.interfaces.nsIWebBrowserPersist);
	    
	    persist.persistFlags = Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
	    persist.persistFlags |= Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
	    
	    this.persistListener.persist = persist;
	    this.persistListener.grabber = this;
	    persist.progressListener = this.persistListener;
		
		var privacyContext = null;
		
		try{
		
		    privacyContext = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
	                                 .getInterface(Components.interfaces.nsIWebNavigation)
	                                 .QueryInterface(nsILoadContext);
			
		}
		catch( ex ){
			
		}
		
	    // save the canvas data to the file
	    persist.saveURI(source, null, null, null, null, file, privacyContext);
	}
	
    this._saveCanvas = function(canvas){
    
		if( !canvas ){
			// change type no grab file
			this.grabType = "no_save_image";
		}
		
        if (this.grabType == "save_file") {
            // convert string filepath to an nsIFile
            var file = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties).get('ProfD', Components.interfaces.nsIFile);
            file.append(fvd_speed_dial_speedDialSSD.STORAGE_FOLDER);
			
           
            if (!file.exists()) 
                file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, parseInt("0755", 8));
            
            file.append(fvd_speed_dial_speedDialSSD.SPEED_DIAL_SCREENSHOTS_DIRECTORY);
            
            if (!file.exists()) 
                file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, parseInt("0755", 8));
            
            file.append(this.fileName + ".png");
            
            // create a data url from the canvas and then create URIs of the source and targets  
            var io = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
            
            // check what we wants to save, canvas image or forced specified image
            var imageUrl = null;
			/*
            if (this.forceScreen) {
                imageUrl = this.forceScreen;
            }
            else {*/
                imageUrl = canvas.toDataURL("image/png", "");
            /*}*/
            
            var source = io.newURI(imageUrl, "UTF8", null);
            var target = io.newFileURI(file)
            
            // prepare to save the canvas data
            var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Components.interfaces.nsIWebBrowserPersist);
            
            persist.persistFlags = Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
            persist.persistFlags |= Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
            
            this.persistListener.persist = persist;
            this.persistListener.grabber = this;
            persist.progressListener = this.persistListener;
            
			var privacyContext = null;
			
			try{
			
			    privacyContext = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
		                                 .getInterface(Components.interfaces.nsIWebNavigation)
		                                 .QueryInterface(nsILoadContext);
				
			}
			catch( ex ){
				
			}
			
            // save the canvas data to the file
            persist.saveURI(source, null, null, null, null, file);
        }
        else if (this.grabType == "get_image_url") {
        	this.callback(canvas.toDataURL("image/png", ""), this.title, this);
        }
		else if(this.grabType == "no_save_image"){
			this.callback(this.fileName, this.title, this);
		}
        
    }
    
    this.persistListener = {
        persist: null,
        grabber: null,
        onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus){
            if (this.persist.currentState == 3) {
                // saving of image done, call callback		
                if (this.grabber.callback) {
                    this.grabber.callback(this.grabber.fileName, this.grabber.title, this.grabber);
                }
            }
        }
    }, 
	
	this._frameEventListener = {
		grabberInstance: null,
		loadObtained: true, // test for load obtained always true
		finishTimeout: null,
		complete: false,
		
		timerListener: {
			_frameEventListener: null,
			observe: function(subject, topic, data) {  
				//dump( "Complete!" );
				
				
				
				if( this._frameEventListener.grabberInstance.progressListener.activeRequestsCount != 0 ){
					//dump( "NOT TIME! ACTIVE REQUESTS " + this._frameEventListener.grabberInstance.progressListener.activeRequestsCount + "("+this._frameEventListener.grabberInstance.progressListener.activeRequests+")\r\n" );
					
					this._frameEventListener.startTimeout();
					return;
				}
				
				if( this._frameEventListener.grabberInstance._frame() ){
					//dump( "Grabber instance not destroyed\r\n" );	
					this._frameEventListener.complete = true;
					this._frameEventListener.grabberInstance._callbackLoaded.call(this._frameEventListener.grabberInstance);					
				}
				else{
					//dump( "Grabber instance destroyed\r\n" );	
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
			if( this.complete ){
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
			this.finishTimeout.init(this.timerListener, this.grabberInstance.delay * 1000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);  
						
			//dump( "START TIMEOUT\r\n" );
		},
		
		handleEvent: function( event ){
			//dump( event.type + "\r\n" );
			
			if( event.type == "load" ){
				var inst = this;
				
				this.loadObtained = true;
			}
			else if( event.type == "pageshow" ){
				if( this.loadObtained ){
					if( this.finishTimeout ){
						clearTimeout( this.finishTimeout );
					}
					// finished
					this.startTimeout();	
				}
			}
		}
    }
    
    this._createFrame = function(pageUrl){
		
		
		
		try{
			this.frameId = this._fvdInst.getNextLoadFrameId( fvd_speed_dial_speedDialSSD.id, this.waitGrabQueueId );
		}
		catch( ex ){
			// destotroy if error in get next frame id(maybe user close SD window)
			//dump( "Fail create frame " + ex + "\r\n" );
			this.destroy();
			return;
		}
		
		if( typeof this.frameId == "string" && this.frameId.indexOf("_") != -1 ){			
			var tmp = this.frameId.split( "_" );
			if( tmp[0] == "wait" ){
				this.waitGrabQueueId = parseInt(tmp[1]);		
				this.frameId = tmp[0];		
			}
		}
		
		if( this.frameId == "wait" ){
			
			try{
				this.obtainFrameIdTimeout = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);  		
				var inst = this;		  
				this.obtainFrameIdTimeout.init(function(){
					inst._createFrame.call( inst, pageUrl );
				}, this.obtainFrameIdTimeoutDuration, Components.interfaces.nsITimer.TYPE_ONE_SHOT);  				
			}
			catch( ex ){
				
			}
			
			
			
			
			return;
		}
		else{
	
		}

		

		//dump( "OBTAINED FRAME ID " + this.frameId + "\r\n" );
		
        var windowWidth = window.innerWidth - 25;
        var iframe;
        iframe = document.createElement("browser");
        iframe.setAttribute("type", "content");
        		
		iframe.setAttribute("id", this.frameId);
        iframe.setAttribute("height", 10);
        //iframe.setAttribute("disablehistory", true);
        iframe.style.maxWidth = "1024px";
        iframe.style.minWidth = "1024px";
        
        iframe.style.visibility = "hidden";
        
		this._frameEventListener.grabberInstance = this;
		
        var inst = this;
		
		iframe.addEventListener("load", this._frameEventListener, true);        
        iframe.addEventListener("pageshow", this._frameEventListener, true);
        iframe.addEventListener("pageshow", this._frameEventListener, true);
		iframe.addEventListener("pagehide", this._frameEventListener, true);

		iframe.addEventListener("unload", this._frameEventListener, true);
		iframe.addEventListener("DOMLinkAdded", this._frameEventListener, true);
		   
	   
		iframe.setAttribute("src", pageUrl);
		
        SpeedDialSSDPageGrabberMisc.container().appendChild(iframe);
        
		
        //wrappedJSObject

        this.enableJs = (this.enableJs === 1 || this.enableJs === "1" || this.enableJs === true ) ? true : false;
        this.disablePlugins = (this.disablePlugins === 1 || this.disablePlugins === "1" || this.disablePlugins === true ) ? true : false;
		
        iframe.docShell.allowJavascript = this.enableJs;
       	iframe.docShell.allowPlugins = !this.disablePlugins;
        iframe.docShell.allowAuth = false;
        //iframe.docShell.allowSubframes = false;
        
		
 		this.progressListener.inst = this;
        iframe.addProgressListener(this.progressListener);
		
		// start timeout checker 
		
		this.startTimeoutChecker();
		
        //dump("START GRAB, JS = " + this.enableJs + ", delay = "+this.delay+", Disable plugins: "+this.disablePlugins+"\r\n");
    }
    
    this._frame = function(){
        return this._fvdInst.document().getElementById( this.frameId );
    }
    
    this._callbackLoaded = function(){
		try{
	        var ldrFrame = this._frame();			
		}	
		catch(ex){
			//dump( "Fail get loaded frame, " + ex + "\r\n" );
			this.destroy();
			return false;
		}	
        
		try{
	        //dump("Loaded parent is = " + ldrFrame.contentWindow.parent + "\r\n");
	        
	        var remoteWindow = ldrFrame.contentWindow;
	        var remoteDoc = ldrFrame.contentDocument.documentElement;
	        
	        var canvas = document.createElementNS("http://www.w3.org/1999/xhtml", "html:canvas");
	        
	        var windowWidth = remoteDoc.scrollWidth;
	        var windowHeight = remoteDoc.scrollHeight;
	        
	        if (windowHeight > this.maxScreenShotHeight) {
	            windowHeight = this.maxScreenShotHeight;
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
	            //dump("FAIL DRAW WINDOW: " + ex + "(" + remoteWindow + ": " + windowWidth + ", " + windowHeight + ")\r\n");
	        }
	        
	        
	        ctx.restore();
	        
	       ///dump("START");
	        
	        if (remoteDoc.title) {
	            this.title = remoteDoc.title;
	        }
	        else 
	            if (ldrFrame.contentDocument.title) {
	                this.title = ldrFrame.contentDocument.title;
	            }
	        
			if( this.saveCanvasCallback ){
				// call custom callback
				this.saveCanvasCallback( canvas );
			}
			else{
				this._saveCanvas(canvas);
			}
		}
		catch( ex ){
			//if fail save canvas then not called callback and not free grame. destroy grabber for free frame
			//dump( "Fail save canvas " + ex + "\r\n" );
			this.destroy();
		}
        
        //document.getElementById("grab_frames_container").appendChild(canvas);
    }
    
    this.grab = function(callback){	
        this.callback = callback;
		if( this.forceScreen ){
			this._grabScreen();	
		}
		else{
	        this._createFrame(this.pageUrl);			
		}
    }
    
	this._grabScreen = function(){
		var img = new Image();
		var inst = this;		
		
		img.setAttribute( "validate", "always" );		
		
		img.onload = function(){
			
		
			
			var canvas = document.createElementNS("http://www.w3.org/1999/xhtml", "html:canvas");
			
			var ctx = canvas.getContext('2d');
			
			var width = img.width;
			var height = img.height;
			
			if (width > inst.forceScreenMaxWidth) {
				var width = inst.forceScreenMaxWidth;
				var ratio = img.width / img.height;
				var height = Math.round(width / ratio);
			}
			
			canvas.width = width;
			canvas.height = height;
			
			inst.resultSize = {
				width: width,
				height: height
			};
			
			ctx.drawImage( img, 0, 0, width, height );			

			// grab title
			if( inst.pageUrl && !inst.forceScreenNoTitle ){
				inst._grabTitle( function( title ){					
					inst.title = title;
					inst._saveCanvas( canvas );						
				} );				
			}
			else{
				inst._saveCanvas( canvas );	
			}
		}
		
		img.onerror = function(){
			inst.failed = true;
			// no action to grab thumb
			if( inst.pageUrl && !inst.forceScreenNoTitle ){
				inst._grabTitle( function( title ){
					inst.title = title;
					inst._saveCanvas( null );						
				} );
			}
			else{
				inst._saveCanvas( null );						
			}

		}
		
		img.src = this.forceScreen;	

	}
	
	this._grabTitle = function( callback ){
		this.saveCanvasCallback = function(){
			callback( this.title );
		}		
		
		if( this.noGrabTitle ){
			this.saveCanvasCallback();
		}
		else{
			this._createFrame( this.pageUrl );			
		}
	}
	
    this.destroy = function(){		
		//dump( "DESTROY!\r\n" );
		
		this.destroyed = true;
		
        var frame = this._frame();
        if ( frame ) {
			//dump( "FRAME FOUND!\r\n" );
			
			//dump( "Destrot grab browser " + this.frameId + "\r\n" );
			this._fvdInst.clearGrabFrame();
            frame.parentNode.removeChild(frame);
        }
		else{

		}
		
		if( this.waitGrabQueueId ){
			this._fvdInst.clearQueueId( this.waitGrabQueueId );
		}
    }
}


