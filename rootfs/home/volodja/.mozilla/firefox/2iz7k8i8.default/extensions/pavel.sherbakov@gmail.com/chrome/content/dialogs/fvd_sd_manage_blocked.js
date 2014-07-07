Components.utils.import("resource://fvd.speeddial.modules/properties.js");

function onOK(){
	var tree = document.getElementsByTagName("tree")[0];
	
	var start = {},
		end = {},
		numRanges = tree.view.selection.getRangeCount(),
		selectedIndices = [];
	
	for (var t = 0; t < numRanges; t++){
		tree.view.selection.getRangeAt(t, start, end);
		for (var v = start.value; v <= end.value; v++) {
			selectedIndices.push(v);
		}
	}
	
	for( var i = 0; i != selectedIndices.length; i++ ){
		var id = tree.view.getCellValue( selectedIndices[i], tree.treeBoxObject.columns[0] );
		if( id ){
			//dump( "REMOVE " + id + "\r\n" );
			storage.removeDeny( id );
		}
	}
	
	buildTree();
	
	return false;
}

function getSelectedItemsCount(){
	var tree = document.getElementsByTagName("tree")[0];
	
	var start = {},
		end = {},
		numRanges = tree.view.selection.getRangeCount(),
		selectedIndices = [];
		
	var count = 0;
	
	for (var t = 0; t < numRanges; t++){
		tree.view.selection.getRangeAt(t, start, end);
		for (var v = start.value; v <= end.value; v++) {
			count++;	
		}
	}
	
	return count;
}



function onCancel(){
	return true;
}

function blockDialog( params ){
	params = params || {};
	openDialog('chrome://fvd.speeddial/content/dialogs/fvd_sd_block.xul', '', 'chrome,titlebar,toolbar,centerscreen,modal', params);
	return params;
}

function addBlock(){
	var result = blockDialog();
	
	if( !result || !result.success ){
		return false;
	}
	
	if( !result.uri ){
		return false;
	}
		
	storage.denyUrl( result.uri, result.type );		

	
	buildTree();
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

function unblockPopuped(){
	var id = selectedTreeValue();
	if (id) {
		storage.removeDeny( id );		
		buildTree();
	}
}

function openPopuped(){
	var id = selectedTreeValue();
	if (id) {
		var data = storage.getDenyById( id );
		if( data ){
			var url = data.sign;
			if( data.type == "domain" ){
				url = "http://"+url;
			}
			
			browser = window.opener.opener.gBrowser;
			
			var tab = browser.addTab(url);
            browser.selectedTab = tab;
		}
	}
	

}

function editSelected(){
	if( getSelectedItemsCount() > 1 ){
		
		var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                              		  .getService(Components.interfaces.nsIPromptService);
									  
		promptService.alert( 
			window,
			fvd_speed_dial_FVDSSDToolbarProperties.getString("fvd.toolbar",
			"alert.sd_many_items_seleted.title"),
			fvd_speed_dial_FVDSSDToolbarProperties.getString("fvd.toolbar",
			"alert.sd_many_items_seleted.text"
		));						
		
		return false;
	}
	
	editPopuped();
}

function editPopuped(){
	var id = selectedTreeValue();
	if( id ){
		var data = storage.getDenyById( id );
		var result = blockDialog( {
			type: data.type,
			uri: data.sign			
		} );
		if( result && result.success && result.uri ){
			storage.updateDeny( id, {
				type: result.type,
				sign: result.uri
			} );
			buildTree();
		}
	}
}

function buildTree(){
	var denyList = storage.denyList();
	var container = document.getElementsByTagName( "treechildren" )[0];
	while( container.firstChild ){
		container.removeChild(container.firstChild);
	}
	for( var i = 0; i != denyList.length; i++ ){
		var deny = denyList[i];
		var item = document.createElement("treeitem");
		var row = document.createElement("treerow");		
				
		var cellSign = document.createElement("treecell");
		var cellType = document.createElement("treecell");
		cellSign.setAttribute( "label", deny.sign );
		cellSign.setAttribute( "value", deny.id );
		
		cellType.setAttribute( "label", deny.type );
		
		cellSign.setAttribute( "tooltiptext", deny.sign );
		
		
		
		row.appendChild(cellSign);
		row.appendChild(cellType);
		item.appendChild( row );
		container.appendChild( item );
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

window.addEventListener("load", function(){
	buildTree();
	
	var Ci = Components.interfaces;
	var xulWin = window.QueryInterface(Ci.nsIInterfaceRequestor)
	   .getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShellTreeItem)
	   .treeOwner.QueryInterface(Ci.nsIInterfaceRequestor)
	   .getInterface(Ci.nsIXULWindow);
	xulWin.zLevel = xulWin.raisedZ;	
}, false);
