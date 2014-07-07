var EXPORTED_SYMBOLS = ["fvd_speed_dial_RestorePrefs"]; 

Components.utils.import("resource://fvd.speeddial.modules/settings.js");

/*
 * Usage: to backup prefs before addon removing/disabling to restore if enabled again
 */

fvd_speed_dial_RestorePrefs = new function(){
	
	function getPrefsToRestore(){
		var text = fvd_speed_dial_gFVDSSDSettings.getStringVal( "restore_prefs" );
		var obj = {};
		
		try{
			obj = JSON.parse( text );
		}
		catch( ex ){
			
		}
		
		return obj;
	}
	
	function setPrefsToRestore( prefs ){
		
		fvd_speed_dial_gFVDSSDSettings.setStringVal( "restore_prefs", JSON.stringify( prefs ) );
				
	}
	
	this.setPrefToRestore = function( name, value, type ){
		
		var prefs = getPrefsToRestore();
		prefs[name] = {
			value: value,
			type: type
		};

		setPrefsToRestore( prefs );
				
	}
	
	this.restorePrefs = function(){
		
		var obj = getPrefsToRestore();
		
		var branch = fvd_speed_dial_gFVDSSDSettings.branch( "" );
		
		for( var k in obj ){
			var v = obj[k];
			
			switch( v.type ){
				case "string":
					branch.setCharPref( k, v.value );
				break;
				case "bool":
					branch.setBoolPref( k, v.value );
				break;
				case "int":
					branch.setIntPref( k, v.value );
				break;
			}
		}
		
		setPrefsToRestore({});
		
	}
	
};
