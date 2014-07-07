var EXPORTED_SYMBOLS = ["fvd_speed_dial_RemoteRequest"]; 

Components.utils.import("resource://fvd.speeddial.modules/misc.js");


var fvd_speed_dial_RemoteRequest = {
	
	SDPREVIEW_URL_PREFIX: "https://everhelper.me/sdpreviews",
	
	currentXHR: [],
	
	cancelAllRequests: function(){
		
		this.currentXHR.forEach(function( xhr ){
			xhr.abort();
		});
		
		this.currentXHR = [];
		
	},
	
	listImages: function( host, pageNum, order, callback, on_page ){
		
		if( !host ){
			return callback( [] );
		}
		
		var params = {
			p: pageNum,
			order: order,
			host: host
		};
		
		if( on_page ){
			params.on_page = on_page;
		}
		
		this.request( "listing.php", params, callback );				
		
	},
	
	report: function( sdPreviewId, type, callback ){
		
		this.request( "report.php", {
			sdpreview_id: sdPreviewId,
			type: type
		}, callback );		
		
	},
			
	
	rate: function( sdPreviewId, callback ){
				
		var main = fvd_speed_dial_Misc.getMainWindow(  );		
			
		var url = this.SDPREVIEW_URL_PREFIX + "/rating.php?sdpreview_id=" + encodeURIComponent(sdPreviewId);
		
		main.fvd_speed_dial_fvdSSD.bgXHRRequest(url);	
			
	},
	
	request: function( file, params, callback, xhr ){
						
		var url = this.SDPREVIEW_URL_PREFIX + "/" + file;
		var that = this;
			
		var queryStr = [];
		
		for( var k in params ){
			queryStr.push( k + "=" + encodeURIComponent( params[k] ) );
		}
		
		url += "?" + queryStr.join("&");
		
		var xhr = xhr || Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();

		that.currentXHR.push( xhr );
		
		xhr.open( "GET", url );
		
		xhr.onload = function(){
			
			var index = that.currentXHR.indexOf( xhr );
			if( index != -1 ){
				that.currentXHR.splice( index, 1 );
			}
			
			try{
				var response = JSON.parse( xhr.responseText );
				if( response.errorCode ){
					return callback( new Error( "Server returns error " + response.errorCode ) );
				}
			}
			catch( ex ){
				return callback( new Error( "Fail parse server response" ) );
			}										
			
			callback( null, response.body );
			
		};
		
		xhr.onerror = function(){

			var index = that.currentXHR.indexOf( xhr );
			if( index != -1 ){
				that.currentXHR.splice( index, 1 );
			}
			
			callback( new Error( "Fail make request" ) );
			
		};
		
		xhr.send( null );
		
	}
	
};