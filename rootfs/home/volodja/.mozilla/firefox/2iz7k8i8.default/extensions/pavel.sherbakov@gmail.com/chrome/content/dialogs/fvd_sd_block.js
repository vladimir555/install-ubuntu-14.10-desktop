Components.utils.import("resource://fvd.speeddial.modules/properties.js");

function onOK(){
	var params = window.arguments[0];
	
	if(document.getElementById("block_uri").selected){
		params.type = "url";
	}
	else if( document.getElementById("block_domain").selected ){
		params.type = "domain";
	}	
	
	params.uri = document.getElementById("uri").value;
	
	if( params.uri.indexOf(".") == -1 || params.uri.length < 3 ){
		// user enter wrong url/domain
	    var txt = fvd_speed_dial_FVDSSDToolbarProperties.getString("fvd.toolbar", 'alert.sd_wrong_url.fvd_suite_not_runned.text');
	    var title = fvd_speed_dial_FVDSSDToolbarProperties.getString("fvd.toolbar", 'alert.sd_wrong_url.fvd_suite_not_runned.title');
	            
	    var prompts = Components.classes['@mozilla.org/embedcomp/prompt-service;1'].getService(Components.interfaces.nsIPromptService);
	    prompts.alert(window, title, txt);
		return false;
	}
	
	params.success = true;
	
	return true;
}

function onCancel(){
	return true;
}

function setBlockType( type ){
	if( type == currentType ){
		return;
	}
	currentType = type;
	switch( type ){
		case "url":		
			// check as domain is vaild url
			if( FVDSSDMisc.isCorrectUrl( document.getElementById( "uri" ).value ) ){
				blockedUri = document.getElementById( "uri" ).value;
			}
			document.getElementById( "uri" ).value = blockedUri;
		break;
		case "domain":
			blockedUri = document.getElementById( "uri" ).value;
			document.getElementById( "uri" ).value = FVDSSDMisc.getHostByUrl(blockedUri);
		break;
	}
}

var currentType = "url";
var blockedUri = "";

// init

window.onload = function(){
	if( window.arguments[0]){
		var params = window.arguments[0];
		if( params.uri ){
			document.getElementById( "uri" ).value = params.uri;		
			blockedUri = params.uri;
		}
		if( params.type ){
			switch( params.type ){
				case "url":
					document.getElementById("block_type").selectedIndex = 0;
				break;
				case "domain":
					document.getElementById("block_type").selectedIndex = 1;
				break;
			}
			currentType = params.type;
		}
	
	}
}



