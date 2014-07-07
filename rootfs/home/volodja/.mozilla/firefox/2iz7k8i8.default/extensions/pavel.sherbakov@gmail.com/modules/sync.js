var EXPORTED_SYMBOLS = ["fvd_speed_dial_Sync"]; 

try{
	Components.utils.import("resource://fvd.sync.modules/drivers/SpeedDial.js");	
}
catch( ex ){
	
}

fvd_speed_dial_Sync = new function(){
	
	var self = this;
	
	function proxy( functionName, params ){
		
		if( typeof SpeedDial != "undefined" ){
			
			return SpeedDial[functionName].apply(SpeedDial, params);
				
		}
				
	}
	
	var proxyFunctionsList = [
		"syncData",
		"syncDataCond",
		"getLastUpdateInfo",
		"skipLastUpdate",
		"openSyncTypeDialog",
		"getState",
		"openSyncProgressDialog",
		"hasToSyncData",
		"isActive",
		"acquireSyncLock",
		"releaseSyncLock",
		"abortCurrentSync",
		
		"mergeLocalAndServerData",
		"overwriteServerData",
		"overwriteLocalData",
		"applyServerUpdates",
		"getSyncData",
		"activeCondCheckersCount",
		"hasUpdates",
		"getUpdatesConflicts",
		"removeSyncData",
		"mergeLocalAndServerDataGroup",
		"uploadUpdates",
		"setState",
		"isSetuped",
		"openSettings",
		"quotaExceedMessageShow",
		"loginIncorrectMessageShow"
	];
	
	proxyFunctionsList.forEach( function( functionName ){
		
		self[ functionName ] = function(){
			
			try{
				var result = proxy( functionName, arguments );				
			}
			catch( ex ){
				//dump( functionName + " : Fail to call - " + ex + "\n" );			
			}

			
			//dump( functionName + " : " + result + "\n" );
			
			return result;
			
		}
		
	} );
	
	this.fvdSynchronizerAvailable = function(){
		
		if (typeof SpeedDial != "undefined") {
			return true;
		}
		
		return false;
		
	}
	
	if( typeof SpeedDial != "undefined" ){
		SpeedDial.setInitCallback(function(){
			
			self.Errors = SpeedDial.Errors;
			
		});
		
	}
	
}
