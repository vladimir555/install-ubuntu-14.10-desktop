var EXPORTED_SYMBOLS = ["AddonManager"]; 

try{
	Components.utils.import('resource://gre/modules/AddonManager.jsm');	
}
catch( ex ){
	AddonManager = {
		
		getAddonByID: function( addonId, callback ){
			
			var em = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);  
			var addon = null;
			
			try{
				addon = em.getItemForID("extension-guid@example.org");  				
			}
			catch( ex ){
				
			}
			
			callback( addon );			
			
		}
		
	};
}
