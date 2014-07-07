Components.utils.import("resource://fvd.speeddial.modules/settings.js");
Components.utils.import("resource://fvd.speeddial.modules/properties.js");
Components.utils.import("resource://fvd.speeddial.modules/sync.js");

function emptyNameAlert(){
	var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                  				  .getService(Components.interfaces.nsIPromptService);
	promptService.alert( window, 
						 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "alert.sd_empty_group_name.title"),
						 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "alert.sd_empty_group_name.text") );
}

function onOK(){
	var name = document.getElementById( "name" ).value.trim();
	
	if( !name ){
		emptyNameAlert();
		return false;
	}
	
	params = window.arguments[0];
	
	params.name = name;
	params.ok = true;
	
	window.arguments[0] = params;
	
	return true;
}

function onCancel(){
	return true;
}

function selectedTreeValue(){
	try{
		var tree = document.getElementsByTagName("tree")[0];
		var index = tree.view.selection.currentIndex;
		var value = tree.view.getCellValue( index, tree.treeBoxObject.columns[0] );
		
		return value;		
	}
	catch( ex ){
		return false;
	}
}

function removeSelected(){
	var id = selectedTreeValue();
	
	if( id ){
		fvd_speed_dial_speedDialSSD.removeGroup( id );
		buildTree();
	}
}

function editSelected(){
	var id = selectedTreeValue();
	if( id ){
		var group = storage.getGroupById( id );		
		if( group ){
			fvd_speed_dial_speedDialSSD.editGroup( group );
			buildTree();
		}
	}
}

function changePosSelected( type ){
	
	var id = selectedTreeValue();
	if( id ){		
		var tree = document.getElementsByTagName("tree")[0];
		var t = tree.view.selection.currentIndex;
		var changedGroups = storage.changePos( id, type );
		/*
		buildTree({
			focusTo: id
		});
		*/
		var container = document.getElementsByTagName( "treechildren" )[0];
		var item = document.getElementById("group_item_"+id);
		if( type == "bottom" ){
		  var before = item.nextSibling;
		  if(before) {
		    before = before.nextSibling;
		  }
		  if(before) {
		    container.insertBefore(item, before);
		  }
		  else {
		    container.appendChild(item);
		  }
			tree.view.selection.currentIndex = t + 1;			
		}
		else if( type == "top" && t != 0 ){
		  var before = item.previousSibling;
		  if(before) {
		    container.insertBefore(item, before);
		  }
		  else {
		    container.appendChild(item);
		  }
			tree.view.selection.currentIndex = t - 1;			
		}				
		boxObject().ensureRowIsVisible( getGroupIndex(id) ); 
		// need sync all groups		
		changedGroups.forEach( function( groupId ){
			fvd_speed_dial_Sync.syncData( ["groups"], storage.groupGlobalId( groupId ) );	
		} );		
	}
}

function getGroupIndex(id) {
  var container = document.getElementsByTagName( "treechildren" )[0];
  var item = document.getElementById("group_item_"+id);
  var children = Array.prototype.slice.call(container.children);
  return children.indexOf(item);
}

function boxObject() {
  var bo = document.getElementsByTagName( "tree" )[0].boxObject;
  return bo;
}

function buildTree( params ){
	
	params = params || {};
	
	var groups = storage.getGroupsList();
	
	var container = document.getElementsByTagName( "treechildren" )[0];
	while( container.firstChild ){
		container.removeChild(container.firstChild);
	}
	
	var focustToRow = 0;
	
	for( var i = 0; i != groups.length; i++ ){
		var group = groups[i];
		
		if( params.focusTo && params.focusTo == group.id ){
			focustToRow = i;
		}
		
		var item = document.createElement("treeitem");
		item.setAttribute("id", "group_item_"+group.id);
		var row = document.createElement("treerow");		
				
		var cell = document.createElement("treecell");

		cell.setAttribute( "label", group.name );
		cell.setAttribute( "value", group.id );		
		cell.setAttribute( "tooltiptext", group.name );
		
		var cellCount = document.createElement("treecell");

		cellCount.setAttribute( "label", storage.count( group.id ) );
		
		var cellSync = document.createElement("treecell");
		
		cellSync.setAttribute( "label", group.sync == 1 ? 
			fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "sd.yes") :
			fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "sd.no") 
		);
		
		row.appendChild(cell);
		row.appendChild(cellCount);
		//row.appendChild(cellSync);		

		item.appendChild( row );
		container.appendChild( item );
	}
	
	if( params.focusTo ){
		
		var bo = document.getElementsByTagName( "tree" )[0].boxObject;		
		bo.ensureRowIsVisible( focustToRow );
		
	}
	
}

var storage;
Components.utils.import("resource://fvd.speeddial.modules/storage.js");
try{
    storage = fvd_speed_dial_Storage;			
}
catch( ex ){
	//dump( "Fail init storage\r\n" );	
}

window.onload = function(){
	fvd_speed_dial_speedDialSSD.init();
    fvd_speed_dial_speedDialSSD.passiveMode = true;
	
	buildTree();
}
