FVDSSDMisc = {
	processes: [],
	
	stringToUrl: function( string ){
		try{
			var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
	        return ioService.newURI(string, null, null);
		}
		catch(ex){
			return null;
		}
	},
	
	isAboutUrl: function( url ){
		if( url.indexOf("about:") == 0 ){
			return true;
		}
		
		return false;
	},
	
	isUrl: function(url){		
		var url = this.stringToUrl( url );
		if( !url ){
			return false;
		}
		return true;
	},
	
	isCorrectUrl: function(url){
		var url = this.stringToUrl( url );
	
		if( !url ){
			return false;
		}
		/*
		var allowSchemes = [ "http", "https", "file", "chrome" ];
		
		if( allowSchemes.indexOf( url.scheme.toLowerCase() ) == -1 ){
			return false;
		}
		*/
		
		return true;
	},
	
	fileToNativeUri: function(localFile){
		var ios = Components.classes["@mozilla.org/network/io-service;1"].
	          					 getService(Components.interfaces.nsIIOService);
		return ios.newFileURI(localFile);			
	},
	
	fileToURI: function( localFile ){
		var url = this.fileToNativeUri( localFile );	
		url = url.spec;
		
		return url;		
	},
	
	filePathToURI: function( path ){
		try{
			if (fvd_speed_dial_Misc.appVersion() < 13) {
				var localFile = Components.classes["@mozilla.org/file/local;1"]
			                			  .createInstance(Components.interfaces.nsILocalFile);	
			}
			else{
				var localFile = Components.classes["@mozilla.org/file/local;1"]
			                			  .createInstance(Components.interfaces.nsIFile);	
			}
									  	
			localFile.initWithPath( path );
	
			return 	this.fileToURI(localFile);	  
		}
		catch( ex ){			
			return null;
		}
	},
	
	getHostByUrl: function( urlString ){
		try{
			var url = this.stringToUrl( urlString );
			return url.host;
		}
		catch( ex ){
			
		}
		
		return null;
	},
	
	extendObject: function( object, dataToExtend ){
		for( var k in dataToExtend ){
			object[k] = dataToExtend[k];
		}
		return object;
	},
	
	dump: function( object ){
		for( k in object ){
			try{
				if( typeof object[k] == "function" ){
					continue;
				}
				
				dump( k + " = " + object[k] + "\r\n" );
			}
			catch( ex ){
				
			}
		}
	},
	
	runProcess: function( name, process ){
		if( this.processes.indexOf( name ) != -1 ){
			return false;
		}
		
		this.processes.push( name );
		
		process();
		
		var index = this.processes.indexOf( name );
		this.processes.splice( index, 1 );
	}
};
