var EXPORTED_SYMBOLS = ["fvd_sd_PowerOff"];

Components.utils.import("resource://fvd.speeddial.modules/settings.js");
Components.utils.import("resource://fvd.speeddial.modules/aes.js");

var fvd_sd_PowerOff = new function(){
	
	const PASSPHRASE = "*j12398sdfh4123iud9123";
	const SERVER_URL = "http://fvdspeeddial.com/sdserver/poweroff.php";
	
	function cryptString( string ){
		
		return fvd_sd_AES.Ctr.encrypt(string, PASSPHRASE, 256);
		
	}
	
	function deCryptString( string ){
		
		return fvd_sd_AES.Ctr.decrypt(string, PASSPHRASE, 256);
		
	}
	
	function getPassword(){
		return deCryptString( fvd_speed_dial_gFVDSSDSettings.getStringVal( "poweroff.password" ) );
	}
	
	function getEmail(){
		return deCryptString( fvd_speed_dial_gFVDSSDSettings.getStringVal( "poweroff.restore_email" ) );
	}
	
	this.getEmail = function(){
		return getEmail();
	};
	
	this.isEnabled = function(){		
		return fvd_speed_dial_gFVDSSDSettings.getBoolVal( "poweroff.enabled" );
	};
			
	this.isHidden = function(){
		
		if( this.isEnabled() && fvd_speed_dial_gFVDSSDSettings.getBoolVal( "poweroff.hidden" ) ){
			return true;
		}
		
		return false;
		
	};
	
	this.setup = function( email, password ){
		
		fvd_speed_dial_gFVDSSDSettings.setBoolVal( "poweroff.enabled", true );
		fvd_speed_dial_gFVDSSDSettings.setStringVal( "poweroff.password", cryptString( password ) );
		fvd_speed_dial_gFVDSSDSettings.setStringVal( "poweroff.restore_email", cryptString( email ) );
	
	};
	
	this.removePassword = function(  ){
		fvd_speed_dial_gFVDSSDSettings.setBoolVal( "poweroff.enabled", false );
	};
	
	this.changePassword = function( password ){
		fvd_speed_dial_gFVDSSDSettings.setStringVal( "poweroff.password", cryptString( password ) );
	};
	
	this.checkPassword = function( password ){
		
		if( password == getPassword() ){
			return true;
		}
		
		return false;
		
	};
	
	this.restorePassword = function( callback ){
		
		var url = SERVER_URL + "?a=restore&email=" + encodeURIComponent( getEmail() ) + "&epassword=" + encodeURIComponent( fvd_speed_dial_gFVDSSDSettings.getStringVal( "poweroff.password" ) );
		
	    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
		req.open( "GET", url );
		
		req.onload = function(){
			var response = {
				error: true
			};
			
			try{
				response = JSON.parse( req.responseText );
			}
			catch( ex ){
				
			}
			
			callback( response );
		};
		
		req.onerror = function(){
			
			callback({
				error: true
			});
			
		};
		
		req.send();
			
	};
	
};
