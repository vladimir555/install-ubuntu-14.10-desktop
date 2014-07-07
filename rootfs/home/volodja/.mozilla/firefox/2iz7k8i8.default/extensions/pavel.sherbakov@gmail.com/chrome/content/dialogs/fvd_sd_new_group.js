Components.utils.import("resource://fvd.speeddial.modules/properties.js");

function emptyNameAlert(){
	var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                  				  .getService(Components.interfaces.nsIPromptService);
	promptService.alert( window, 
						 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "alert.sd_empty_group_name.title"),
						 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "alert.sd_empty_group_name.text") );
}

function onOK(){
	var name = document.getElementById( "name" ).value.trim();
	var sync = document.getElementById( "sync" ).checked ? 1 : 0;
	
	if( !name ){
		emptyNameAlert();
		return false;
	}
	
	params = window.arguments[0];
	
	params.name = name;
	params.sync = sync;
	params.ok = true;
	
	window.arguments[0] = params;
	
	return true;
}

function onCancel(){
	return true;
}


// init

window.onload = function(){
	if( window.arguments[0].name ){
		document.getElementById( "name" ).value = window.arguments[0].name;		
	}
	
	if ( window.arguments[0].sync ) {
		document.getElementById( "sync" ).checked = true;
	}
	
	sizeToContent();
}



