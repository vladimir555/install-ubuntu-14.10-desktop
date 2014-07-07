var EXPORTED_SYMBOLS = ["fvd_speed_dial_Misc"]; 

Components.utils.import("resource://fvd.speeddial.modules/settings.js");


fvd_speed_dial_Misc = {
	
	appVersion: function(){
		
		var info = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo); 
		
		return info.version.split(".")[0];
		
	},
	
	
	
	objectsDiffFields: function( o1, o2, checkFields ){
		
		var fields = [];
		
		checkFields.forEach( function( field ){
		
			if( o1[field] && o1[field].trim ){
				o1[field] = o1[field].trim();
			}
			
			if( o2[field] && o2[field].trim ){
				o2[field] = o2[field].trim();
			}	
			
			if( o1[field] != o2[field] ){
				fields.push( field );
			}
			
		} );
		
		return fields;
		
	},
	
	ucfirst: function (str) {
	    var f = str.charAt(0).toUpperCase();
	    return f + str.substr(1);
	},
	
	browserLanguage: function(){
		
		var b = fvd_speed_dial_gFVDSSDSettings.branch( "general.useragent." );
		return b.getCharPref( "locale" );
		
	},
	
	parseUrl: function(str, component){			
		
	    // Parse a URL and return its components  
	    // 
	    // version: 1109.2015
	    // discuss at: http://phpjs.org/functions/parse_url
	    // +      original by: Steven Levithan (http://blog.stevenlevithan.com)
	    // + reimplemented by: Brett Zamir (http://brett-zamir.me)
	    // + input by: Lorenzo Pisani
	    // + input by: Tony
	    // + improved by: Brett Zamir (http://brett-zamir.me)
	    // %          note: Based on http://stevenlevithan.com/demo/parseuri/js/assets/parseuri.js
	    // %          note: blog post at http://blog.stevenlevithan.com/archives/parseuri
	    // %          note: demo at http://stevenlevithan.com/demo/parseuri/js/assets/parseuri.js
	    // %          note: Does not replace invalid characters with '_' as in PHP, nor does it return false with
	    // %          note: a seriously malformed URL.
	    // %          note: Besides function name, is essentially the same as parseUri as well as our allowing
	    // %          note: an extra slash after the scheme/protocol (to allow file:/// as in PHP)
	    // *     example 1: parse_url('http://username:password@hostname/path?arg=value#anchor');
	    // *     returns 1: {scheme: 'http', host: 'hostname', user: 'username', pass: 'password', path: '/path', query: 'arg=value', fragment: 'anchor'}
	    var key = ['source', 'scheme', 'authority', 'userInfo', 'user', 'pass', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'fragment'], ini = (this.php_js && this.php_js.ini) ||
	    {}, mode = (ini['phpjs.parse_url.mode'] &&
	    ini['phpjs.parse_url.mode'].local_value) ||
	    'php', parser = {
	        php: /^(?:([^:\/?#]+):)?(?:\/\/()(?:(?:()(?:([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?()(?:(()(?:(?:[^?#\/]*\/)*)()(?:[^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
	        strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
	        loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/\/?)?((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/ // Added one optional slash to post-scheme to catch file:/// (should restrict this)
	    };
	    
	    var m = parser[mode].exec(str), uri = {}, i = 14;
	    while (i--) {
	        if (m[i]) {
	            uri[key[i]] = m[i];
	        }
	    }
	    
	    if (component) {
	        return uri[component.replace('PHP_URL_', '').toLowerCase()];
	    }
	    if (mode !== 'php') {
	        var name = (ini['phpjs.parse_url.queryKey'] &&
	        ini['phpjs.parse_url.queryKey'].local_value) ||
	        'queryKey';
	        parser = /(?:^|&)([^&=]*)=?([^&]*)/g;
	        uri[name] = {};
	        uri[key[12]].replace(parser, function($0, $1, $2){
	            if ($1) {
	                uri[name][$1] = $2;
	            }
	        });
	    }
	    delete uri.source;
	    return uri;
	},
	
	getUrlContents: function (aUrl) {
	    var ioService = Components.classes["@mozilla.org/network/io-service;1"]
		.getService(Components.interfaces.nsIIOService);
	    var scriptableStream = Components
		.classes["@mozilla.org/scriptableinputstream;1"]
		.getService(Components.interfaces.nsIScriptableInputStream);
	
	    var channel = ioService.newChannel(aUrl, null, null);
	    var input = channel.open();
	    scriptableStream.init(input);
	    var str = scriptableStream.read(input.available());
	    scriptableStream.close();
	    input.close();
	
	    return str;
	},
	
	compareHostAppVersionWith: function( compareVersion ){
		
		var info = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo); 		
		
		var versionComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
		
		return  versionComparator.compare( info.version, compareVersion );
		
	},
	
	md5: function( str ){
		
		var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);

		converter.charset = "UTF-8";
		var result = {};

		var data = converter.convertToByteArray(str, result);
		var ch = Components.classes["@mozilla.org/security/hash;1"].createInstance(Components.interfaces.nsICryptoHash);
		ch.init(ch.MD5);
		ch.update(data, data.length);
		var hash = ch.finish(false);
		
		// convert the binary hash data to a hex string.
		var s = [this.toHexString(hash.charCodeAt(i)) for (i in hash)].join("");
		
		return s;
		
		
	},
	
	toHexString: function (charCode){
		return ("0" + charCode.toString(16)).slice(-2);
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
			
			if( fvd_speed_dial_Misc.appVersion() < 13 ){
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
	
	fileURIToPath: function( url ){
		var iOService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);		
		var fileUrl = iOService.newURI( url, null, null );
		var file = fileUrl.QueryInterface(Components.interfaces.nsIFileURL).file;
		return file.path;  
	},
	
	fileExists: function( path ){
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
			
			return localFile.exists();	
		}
		catch( ex ){			
			return false;
		}
	},
	
	loadCSS: function( url ){
		var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
		                    .getService(Components.interfaces.nsIStyleSheetService);
		var ios = Components.classes["@mozilla.org/network/io-service;1"]
		                    .getService(Components.interfaces.nsIIOService);
		var uri = ios.newURI( url, null, null );
		if(!sss.sheetRegistered(uri, sss.USER_SHEET)){
			sss.loadAndRegisterSheet(uri, sss.USER_SHEET);					
		}

	},
	
	validateText: function( type, text ){
		switch( type ){
			case "email":
			
    			var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
				return re.test( text );
			
			break;
		}
	},
	
	prepareUrlToCompare: function( url ){
		url = url.toLowerCase();
		// remove http from sign
		url = url.replace("http://", "");
		url = url.replace("https://", "");		
		// remove www from sign
		url = url.replace( "www.", "" );
		// remove and "/"
		if( url.charAt( url.length - 1 ) == "/" ){
			url = url.substring( 0, url.length - 1 );
		}
		
		return url;
	},
	
	isUrlsEqual: function( url1, url2 ){
		return this.prepareUrlToCompare( url1 ) == this.prepareUrlToCompare( url2 );
	},
	
	arrayUnique: function( a ){
		
		var result = [];
		
		for( var i = 0; i != a.length; i++ ){
			var v = a[i];
			if( result.indexOf( v ) == -1 ){
				result.push( v );
			}
		}
		
		return result;
		
	},
	
	getMainWindow: function(){
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);  
		var mainWindow = wm.getMostRecentWindow("navigator:browser"); 
		
		return mainWindow;
	},
	
	parseHotKey: function( text ){
		var parts = text.split("+");
		
		var modifiers = [];		
		var key = "";
		
		if( parts.length > 0 ){							
			parts.slice( 0, parts.length - 1 ).forEach(function( part ){
				switch( part.trim() ){
					case "CTRL":
						modifiers.push( "accel" );
					break;
					case "ALT":
						modifiers.push( "alt" );							
					break;
					case "SHIFT":
						modifiers.push( "shift" );														
					break;
				}
			});
			key = parts[ parts.length - 1 ].trim();
		}			

		modifiers = modifiers.join( " " );
		
		return {
			modifiers: modifiers,
			key: key
		};
	},
	
	getActiveHotKeys: function( modifiers, key ){
 		var mainWindow = this.getMainWindow();
		
		var keys = [];
		
		key  = key.toLowerCase();
		
		var elements = mainWindow.document.getElementsByTagName( "key" );
		for( var i = 0; i != elements.length; i++ ){
			var element = elements[i];
			if( element.getAttribute( "modifiers" ) == modifiers && element.getAttribute( "key" ).toLowerCase() == key ){
				keys.push( element );
			}
		}
		
		return keys;
	},
	
	isLangInList: function( lang ){
		
		var branch = fvd_speed_dial_gFVDSSDSettings.branch( "intl." );
		
		try{
			var langs = branch.getCharPref( "accept_languages" );
			if( new RegExp( "\\b"+lang+"\\b" ).test( langs ) ){
				return true;
			}
		}
		catch( ex ){
			dump(ex + "\n");
		}
		
		return false;
		
	},
	
	validateText: function( type, text ){
		switch( type ){
			case "email":
			
    			var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
				return re.test( text );
			
			break;
		}
	}
	
};
