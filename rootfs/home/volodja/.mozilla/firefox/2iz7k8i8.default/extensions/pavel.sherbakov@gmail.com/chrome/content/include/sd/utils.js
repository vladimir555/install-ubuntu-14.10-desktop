var speedDialSSDUtils = {
    saveCanvas: function(canvas, destFile, targetWidth, targetHeight){
       
        // create a data url from the canvas and then create URIs of the source and targets  
        var io = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
        var mimeType;
        mimeType = "image/png";
        
        var dataURL = canvas.toDataURL(mimeType, "");
        
        var source = io.newURI(dataURL, "UTF8", null);
        var target = io.newFileURI(destFile)
        
        // prepare to save the canvas data
        var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Components.interfaces.nsIWebBrowserPersist);
        
        persist.persistFlags = Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
        persist.persistFlags |= Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
        
        persist.progressListener = {
            onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress){
            },
            onStateChange: function(aWebProgress, aRequest, aFlag, aStatus){
                // do something
                if (aFlag & Components.interfaces.nsIWebProgressListener.STATE_STOP) {
                    // Store URL in cache...
                    var URLSpec = Components.classes['@mozilla.org/network/protocol;1?name=file'].createInstance(Components.interfaces.nsIFileProtocolHandler).getURLSpecFromFile(destFile);
                }
            }
        };
		
		var privacyContext = null;
		
		try{
		
		    privacyContext = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
	                                 .getInterface(Components.interfaces.nsIWebNavigation)
	                                 .QueryInterface(nsILoadContext);
			
		}
		catch( ex ){
			
		}
        
        // save the canvas data to the file
        persist.saveURI(source, null, null, null, null, destFile, privacyContext);
        
    },
}