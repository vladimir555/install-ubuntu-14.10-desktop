var EXPORTED_SYMBOLS = ["fvd_speed_dial_ScreenController"]; 

Components.utils.import("resource://fvd.speeddial.modules/screen_maker.js");
Components.utils.import("resource://fvd.speeddial.modules/misc.js");
Components.utils.import("resource://fvd.speeddial.modules/storage.js");
Components.utils.import("resource://fvd.speeddial.modules/sync.js");

const DEFAULT_SCREEN_DELAY = 2;

_fvd_speed_dial_ScreenController = function(){
		
	var dialsIdsInQueue = [];
	
	var storage = fvd_speed_dial_Storage;
	var observer = Components.classes['@mozilla.org/observer-service;1'].getService(Components.interfaces.nsIObserverService);
	
	function removeIdFromQueue( id ){
		var index = dialsIdsInQueue.indexOf( id );
		if( index != -1 ){
			dialsIdsInQueue.splice( index, 1 );
		}
	}
		
	function shedule( screenData ){
		
		if( dialsIdsInQueue.indexOf( screenData.dialId ) != -1 ){
			return false;
		}		
		dialsIdsInQueue.push( screenData.dialId );
		
		var origOnSuccess = function(){
			
		}
		var origOnFail = function(){
			
		}
		
		if( screenData.onSuccess ){
			origOnSuccess = screenData.onSuccess;
		}
		
		if( screenData.onFail ){
			origOnFail = screenData.onFail;
		}
		
		screenData.onSuccess = function( result ){
			removeIdFromQueue( screenData.dialId );
			origOnSuccess( result) ;
		}
		
		screenData.onFail = function( result ){
			removeIdFromQueue( screenData.dialId );
			origOnFail( result) ;
		}
		
		fvd_speed_dial_ScreenMaker.shedule( screenData );
		
	}
	
	this.refreshMostVisitedPreview = function( uri ){
		
		var hash = fvd_speed_dial_Misc.md5( uri );
		
		var forceScreen = null;
		
		var data = storage.getMostVisitedData( uri );
		
		if( data ){
			if( data.thumb_source_type == "force_url" ){
				forceScreen = data.thumb_url;
			}
			else if( data.thumb_source_type == "local_file" ){
				forceScreen = fvd_speed_dial_Misc.filePathToURI( data.thumb_url );
			}			
		}
		
		var type = forceScreen ? "image" : "url";		
		
		var updateData = {};
		
		// if not most visited exists set plugins, delay and js data
		if( !storage.mostVisitedModifiedUrlDataExists( uri ) ){
			if( typeof data.use_js != "undefined" ){
				updateData.use_js = data.use_js;				
			}
			
			if( data.delay ){
				updateData.delay = data.delay;
			}	
			if( typeof data.disable_plugins != "undefined" ){
				updateData.disable_plugins = data.disable_plugins;
			}
		}
				
		shedule( {
			dialId: hash,
			type: type,
			imageUrl: forceScreen,
			url: uri,
			delay: data.delay ? data.delay : DEFAULT_SCREEN_DELAY,
			enableJs: data.use_js == 1,
			fileName: hash+".png",
			onSuccess: function( result ){
						
				if( !data.title || data.hand_changed == 0 ){
					// if dial not have title or title not hand changed - update this
					updateData.title = result.title;
				}
				
				updateData.have_preview = "1";
				updateData.status = ""; // thumb grab is success
				
				if( result.size && result.size.width && result.size.height ){
					updateData.thumb_width = result.size.width;
					updateData.thumb_height = result.size.height;	
				}
						
		
						
				storage.setMostVisitedModifiedUrlData( uri, updateData );
				
				observer.notifyObservers(null, "FVD.Toolbar-SD-Dial-Screen-Updated", hash);
			},
			onFail: function( result ){
											
				if( (data.thumb_source_type == "force_url" || data.thumb_source_type == "local_file") && data.have_preview ){
					
				}
				else{
					updateData.status = "thumb_failed"; // thumb grab is failed				
				}	
				
				storage.setMostVisitedModifiedUrlData( uri, updateData );	
				observer.notifyObservers(null, "FVD.Toolbar-SD-Dial-Screen-Updated", hash);					
			}
		} );
		
		
	}
	
	this.refreshSpeedDialPreview = function( dialId, params ){
		params = params || {};
		
		var dial = storage.getDialById( dialId );
		
		if( dial ){
			var forceScreen = null;			
			if( dial.thumb_source_type == "force_url" ){
				forceScreen = dial.thumb_url;				
			}
			else if( dial.thumb_source_type == "local_file" ){
				forceScreen = fvd_speed_dial_Misc.filePathToURI( dial.thumb_url );
			}
			
			updateThumb = true;
	
			var updateData = {};
	
			if( updateThumb && !params.hidden ){
				// remove thumb if exists
				try{
					if( dial.thumb_src ){
						// remove thumb_src from dial data
						updateData.thumb_src = "";
					
					}			
				}
				catch( ex ){
					
				}							
			}
			
			if( dial.ignore_restore_previous_thumb ){
				updateData.ignore_restore_previous_thumb = false;
			}
			
			if( Object.keys( updateData ).length > 0 ){
				storage.updateDialData( dialId, updateData );					
			}
						
			var type = forceScreen ? "image" : "url";
				
			shedule( {
				dialId: dialId,
				type: type,
				imageUrl: forceScreen,
				url: dial.url,
				delay: dial.delay,
				enableJs: dial.use_js == 1,
				fileName: dialId+".png",
				onSuccess: function( result ){									
					var updateData = {
						"thumb_src": dialId,
						last_update_time: Math.round( (new Date()).getTime()/1000 )	
					};
					
					if( !dial.title || dial.hand_changed == 0 ){
						// if dial not have title or title not hand changed - update this
						updateData.title = result.title;
						
						if( dial.title != result.title ){
							// need to shedule sync with this dial
							fvd_speed_dial_Sync.syncData( "dials", storage.dialGlobalId( dialId ) );
						}
					}
				
					
					updateData.status = ""; // thumb grab is success
					
					if( result.size && result.size.width && result.size.height ){
						updateData.thumb_width = result.size.width;
						updateData.thumb_height = result.size.height;	
					}
							
					storage.updateDialData( dialId, updateData );
					observer.notifyObservers(null, "FVD.Toolbar-SD-Dial-Screen-Updated", dialId);
				},
				onFail: function( result ){
					
					if( params.hidden ){
						return;
					}
						
					var updateData = {
						"thumb_src": dialId,
						last_update_time: Math.round( (new Date()).getTime()/1000 )		
					};
										
					if( (dial.thumb_source_type == "force_url" || dial.thumb_source_type == "local_file") && dial.thumb_src ){
						
						if( !data.thumb_width && !data.thumb_height ){
							updateData.status = "thumb_failed"; // thumb grab is failed	
						}
						
					}
					else{
						
						var canRestore = false;
						
						if( dial.restore_previous_thumb != 1 ){
							updateData.status = "thumb_failed"; // thumb grab is failed	
						}
								
					}	
					
					storage.updateDialData( dialId, updateData );	
					observer.notifyObservers(null, "FVD.Toolbar-SD-Dial-Screen-Updated", dialId);					
				}
			} );
			
		}
		
	}
	
}

fvd_speed_dial_ScreenController = new _fvd_speed_dial_ScreenController();
