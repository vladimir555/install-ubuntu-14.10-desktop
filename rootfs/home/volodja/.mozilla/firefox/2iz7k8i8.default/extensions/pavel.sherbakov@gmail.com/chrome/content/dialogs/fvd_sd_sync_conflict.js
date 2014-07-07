Components.utils.import("resource://fvd.speeddial.modules/sync.js");
Components.utils.import("resource://fvd.speeddial.modules/misc.js");
Components.utils.import("resource://fvd.speeddial.modules/async.js");
Components.utils.import("resource://fvd.speeddial.modules/properties.js");
Components.utils.import("resource://fvd.speeddial.modules/settings.js");

var data = arguments[0]; 
var conflict = arguments[0].conflict;

function _( string ){
	
	string = "dialog.sync_conflict." + string;
	
	return fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", string );
	
}

function end(){
	data.save_choice = document.getElementById("save_choice").checked;
	
	window.close();
}

function buildGrid( data, content ){
	
	var gb = content.parentNode.parentNode.parentNode;
		
	if( data == "removed" ){
		gb.className = "removed";
		return;
	}
	
	if( data == "nosync" ){
		gb.className = "nosync";
		return;
	}
	
	while( content.firstChild ){
		content.removeChild( content.firstChild );
	}
	
	var translateAll =
	{
		dial: {
			"name": _("translate_name"),
			"title": _("translate_title"),
			"url": _("translate_url"),
			"groupName": _("translate_group"),
			"update_interval": _("update_interval")
		},
		
		group: {
			"name": _("translate_name")
		}

	};
	
	var conflictFieldsTranslate = {
		"name": "name",
		"url": "url",
		"title": "title",
		"groupName": "group_global_id",
		"update_interval": "update_interval"
	};
	
	var noTitle = false;
	
	if( conflict.type == "dial" ){
						
		if(!data.group){
			data.groupName = _("popup_undefined_group");
		}
		else{
			data.groupName = data.group.name;
		}
		
		if( !data.title ){
			noTitle = true;
			data.title = _("popup_auto_title");
		}
		else if( data.hand_changed == 0 ){
			noTitle = true;
			data.title = _("popup_auto_title");			
		}
		
	}
	
	var translate = translateAll[ conflict.type ];
	
	for( var k in translate ){
		
		if( !data[k] ){
			data[k] = _("none");
		}
		
		var classNameAdditional = "";
		
		if( conflict.conflictFields.indexOf(conflictFieldsTranslate[ k ]) != -1 ){
			classNameAdditional = "conflict";
		}
						
		var tr = document.createElement("row");
		var tdName = document.createElement("label");
		var tdValue = document.createElement("label");					
		
		if( noTitle && k == "title" ){
			classNameAdditional += " italic";
		}
		
		tdValue.setAttribute("crop", "right");
		
		tdName.className = "name";
		tdValue.className = "value " + classNameAdditional;	
		tdName.setAttribute("value", translate[k]);				
		tdValue.setAttribute("value", data[k]);
		
		if( noTitle && k == "title" ){
			
		}
		else{
			tdValue.setAttribute("tooltiptext", data[k]);						
		}
		
		tr.appendChild( tdName );
		tr.appendChild( tdValue );					
		
		content.appendChild(tr);
	}
	
}

function init(){
	
	buildGrid( conflict.dataClient, document.getElementById("localContentRows") );
	buildGrid( conflict.dataServer, document.getElementById("serverContentRows") );
	
}

function pickLocal(){

	conflict.solve = "local";
	end();		

}

function pickServer(){
	conflict.solve = "server";
	end();
}

window.addEventListener( "load", function(){
	
	var desc = document.getElementsByClassName("desc")[0];
	
	desc.setAttribute( "value", desc.getAttribute("value").replace("content_type", conflict.type) );
	
	document.getElementById("conflictTitle").value = fvd_speed_dial_Misc.ucfirst( conflict.type );
	
	init();
	
}, false );

window.addEventListener( "dialogcancel", function( event ){
	
		
	
}, true );
