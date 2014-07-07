try{
	Components.utils.import('chrome://fvd.speeddial/content/include/sd/m_migrate.js');
}
catch( ex ){
	window.close();
}

Components.utils.import("resource://fvd.speeddial.modules/misc.js");
Components.utils.import("resource://fvd.speeddial.modules/properties.js");

var importInProgress = false;

var prevStepIndex = 0;
var stepIndex = 0;
var lastGroupsList = null;
var lastDialsList = {};

var addonsData = {};

var gFVDSSD = opener.gFVDSSD;
var speedDialSSD = opener.fvd_speed_dial_speedDialSSD;
var observer = Components.classes['@mozilla.org/observer-service;1'].getService(Components.interfaces.nsIObserverService);

function selectAll(){
	switch (stepIndex) {
		case 1:
		
			var groups = document.getElementsByClassName( "addonGroupElem" );
			for( var i = 0; i != groups.length; i++ ){
				if( !groups[i].getAttribute("disabled") ){
					groups[i].checked = true;
				}
			}
		
		break;
		case 2:
		
			var dialsCheckboxes = document.getElementsByClassName( "dialCheckbox" );
			for( var i = 0; i != dialsCheckboxes.length; i++ ){
				if( !dialsCheckboxes[i].getAttribute("disabled") ){
					dialsCheckboxes[i].checked = true;
				}
			}
		
		break;
	}
	
	setupButtons();
}

function unSelectAll(){
	switch (stepIndex) {
		case 1:
		
			var groups = document.getElementsByClassName( "addonGroupElem" );
			for( var i = 0; i != groups.length; i++ ){
				if( !groups[i].getAttribute("disabled") ){
					groups[i].checked = false;
				}
			}
		
		break;
		case 2:
		
			var dialsCheckboxes = document.getElementsByClassName( "dialCheckbox" );
			for( var i = 0; i != dialsCheckboxes.length; i++ ){
				if( !dialsCheckboxes[i].getAttribute("disabled") ){
					dialsCheckboxes[i].checked = false;
				}
			}
		
		break;
	}
	
	setupButtons();
}

function setupButtons(){
	
	var nextButton = document.getElementById("btnNextStep");
	var prevButton = document.getElementById("btnPrevStep");
	var closeButton = document.getElementById( "btnClose" );
	
	var unSelectAllButton = document.getElementById( "btnUnSelectAll" );
	var selectAllButton = document.getElementById( "btnSelectAll" );

	selectAllButton.setAttribute( "hidden", true );
	unSelectAllButton.setAttribute( "hidden", true );

	closeButton.setAttribute( "hidden", true );
	closeButton.setAttribute( "disabled", true );
	
	nextButton.setAttribute( "hidden", true );
	nextButton.setAttribute( "disabled", true );

	prevButton.setAttribute( "hidden", true );
	prevButton.setAttribute( "disabled", true );
	
	switch( stepIndex ){
		case 0:
			nextButton.setAttribute( "hidden", false );
			
			var selectedAddon = document.getElementById("addonId").value;
			
			if( selectedAddon != "" ){
				nextButton.removeAttribute( "disabled" );
			}
		break;
		
		case 1:
			selectAllButton.setAttribute( "hidden", false );
			unSelectAllButton.setAttribute( "hidden", false );	
			
			prevButton.setAttribute( "hidden", false );
			prevButton.setAttribute( "disabled", false );
			nextButton.setAttribute( "hidden", false );
			
			var groups = document.getElementsByClassName( "addonGroupElem" );
			for( var i = 0; i != groups.length; i++ ){
				if( groups[i].checked ){					
					nextButton.setAttribute( "disabled", false );
					break;
				}
			}
		
		break;
		
		case 2:
			selectAllButton.setAttribute( "hidden", false );			
			unSelectAllButton.setAttribute( "hidden", false );	
			
			prevButton.setAttribute( "hidden", false );
			prevButton.setAttribute( "disabled", false );
			nextButton.setAttribute( "hidden", false );
			nextButton.setAttribute( "disabled", true );
			
			var dialsCheckboxes = document.getElementsByClassName( "dialCheckbox" );
			for( var i = 0; i != dialsCheckboxes.length; i++ ){
				if( dialsCheckboxes[i].checked ){
					nextButton.setAttribute( "disabled", false );
					break;
				}
			}
			
		
		break;
		
		case 3:
			
		
		break;
	}
	
}

function errorDialog( title, text ){
	var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                  				  .getService(Components.interfaces.nsIPromptService);
	promptService.alert( window, 
						 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  title),
						 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  text) );
}

function setupStep(){
	var stepNames = {
		0: "stepSelectAddon",
		1: "stepSelectGroups",
		2: "stepSelectUrls",
		3: "importUrls"
	};
	
	var steps = document.getElementsByClassName( "stepData" );
	for( var i = 0; i != steps.length; i++ ){
		steps[i].setAttribute("hidden", true);
	}
	
	var step = document.getElementById( stepNames[ stepIndex ] );
	step.setAttribute("hidden", false);
	
	// step specific actions
	
	if( stepIndex == 1 ){
		// get groups
		 var addonId = document.getElementById("addonId").value;
		 fvd_speed_dial_FVDSDSingleMMigrate.getGroups( addonId, function( groups ){
		 	if( groups == null ){
				errorDialog( "alert.sd_migrate.fail_get_groups.title", "alert.sd_migrate.fail_get_groups.text" );
				toPrevStep();
				return;
			}
			
			lastGroupsList = groups;
			
			var container = document.getElementById( "groupsList" );
			while( container.firstChild ){
				container.removeChild( container.firstChild );
			}
			
			var ignoreStep = false;
			
			if( groups.length == 1 ){
				// ignore group selection sign
				ignoreStep = true;
			}
			
			for( var i = 0; i != groups.length; i++ ){
				var checkbox = document.createElement( "checkbox" );
				var hbox = document.createElement( "hbox" );
				var vbox = document.createElement( "vbox" );
				
				if( ignoreStep ){
					checkbox.checked = true;
				}
				
				checkbox.setAttribute( "value", i );				
				checkbox.setAttribute( "class", "addonGroupElem" );
				checkbox.addEventListener( "command", function( event ){
					setupButtons();
					event.stopPropagation();
				}, true );
				
				var dials = fvd_speed_dial_FVDSDSingleMMigrate.getDialsList( addonId, groups[i] );
				
				var titleLabel = document.createElement( "label" );
				titleLabel.setAttribute( "value", groups[i].name );
				titleLabel.setAttribute( "class", "title" );
				
				var detailsLabel = document.createElement( "label" );
				var tpl = fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "migrate_group_dials" );
				detailsLabel.setAttribute( "value", tpl.replace("{DIALS}", dials.length) );
				detailsLabel.setAttribute( "class", "url" );
				
				vbox.appendChild( titleLabel );			
				vbox.appendChild( detailsLabel );			
				
				
				checkbox.onclick = function( event ){
					event.stopPropagation();
				};
				
				(function( checkbox, hbox ){
					hbox.onclick = function(event){
						checkbox.checked = !checkbox.checked;
						setupButtons();
						event.stopPropagation();
					}
				})(checkbox, hbox);
				
				hbox.appendChild( checkbox );
				hbox.appendChild( vbox );
				
				container.appendChild( hbox );
				
				var separator = document.createElement("separator");	
				separator.setAttribute("class", "groove");
				
				container.appendChild( separator );
			}
			
			if( ignoreStep ){
				if( prevStepIndex == 0 ){
					toNextStep();	
				}
				else{
					toPrevStep();
				}
			}
			
		 });
	}	
	else if( stepIndex == 2 ){
		var container = document.getElementById( "dialsContainer" );
		var groups = document.getElementsByClassName( "addonGroupElem" );
		var addonId = document.getElementById("addonId").value;
		
		
		// calc count groups to create new
		var toCreateGroups = [];
		for (var i = 0; i != groups.length; i++) {
			if (groups[i].checked) {
				var group = lastGroupsList[groups[i].getAttribute("value")];
				
				if( toCreateGroups.indexOf( group.name ) != -1 ){
					continue;
				}
				
				var groupId = speedDialSSD.storage.groupIdByName( group.name );
				if( groupId === false ){
					toCreateGroups.push( group.name );
				}
			}
		}
		var currentInStorageGroupsCount = speedDialSSD.storage.groupsCount();
		var totalGroups = toCreateGroups.length + currentInStorageGroupsCount;
		
		if( totalGroups >= speedDialSSD.MAX_GROUPS_LIMIT ){
			var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
		                  				  .getService(Components.interfaces.nsIPromptService);
			promptService.alert( window, 
								 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "dialog.migrate.max_groups_reached.title"),
								 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "dialog.migrate.max_groups_reached.text").replace("{GROUPS}", speedDialSSD.MAX_GROUPS_LIMIT - currentInStorageGroupsCount ) );
								 
			toPrevStep();
			return;
		}
		
		lastDialsList = {};
		
		while( container.firstChild ){
			container.removeChild( container.firstChild );
		}
		
		var notExistsDials = [];
		var existsDials = [];
		
		for( var i = 0; i != groups.length; i++ ){
			if( groups[i].checked ){					
				var group = lastGroupsList[ groups[i].getAttribute("value") ];
											
				if (group) {
					var dials = fvd_speed_dial_FVDSDSingleMMigrate.getDialsList(addonId, group);
					
					lastDialsList[i] = dials;
					
					for( var j = 0; j != dials.length; j++ ){
						if (speedDialSSD.storage.urlExists(dials[j].url) || speedDialSSD._isDenyUrl(dials[j].url)) {
							existsDials.push( dials[j] );
							dials[j]._groupId = i;
							dials[j]._fullId = i + "_" + j;
							dials[j]._existsInDb = true;
						}
						else{		
							dials[j]._groupId = i;
							dials[j]._fullId = i + "_" + j;
							dials[j]._existsInDb = false;						
							notExistsDials.push( dials[j] );
						}
					}
				}
			}
		}		
		
		var dials = notExistsDials.concat( existsDials );	
		
		for (var j = 0; j != dials.length; j++) {			
			var group = lastGroupsList[dials[j]._groupId];
			
			var elem = document.createElement("hbox");
			elem.setAttribute("align", "start");
			
			var imgHbox = document.createElement("vbox");
			
			var checkbox = document.createElement("checkbox");
			checkbox.setAttribute("value", dials[j]._fullId);
			checkbox.setAttribute("class", "dialCheckbox");
			
			checkbox.onclick = function(event){
				event.stopPropagation();
			}
			
			checkbox.addEventListener("command", function(){
				setupButtons();
			}, false);
			
			var row = document.createElement("vbox");
			row.setAttribute("flex", 2);
			
			var image = document.createElement("image");
			
			(function( j, image ){
				
				speedDialSSD._faviconUrl(dials[j].url, function( faviconUrl ){
					
					image.setAttribute("src", faviconUrl);
					image.setAttribute("width", "16");
					image.setAttribute("height", "16");
					image.setAttribute("class", "favicon");
					
				});
				
			})( j, image );
			
			var labelTitle = document.createElement("label");
			labelTitle.setAttribute("class", "title");
			var labelUrl = document.createElement("label");
			labelUrl.setAttribute("class", "url");
			var labelGroup = document.createElement("label");
			labelGroup.setAttribute("class", "url");
			
			labelTitle.setAttribute("value", dials[j].title);
			labelUrl.setAttribute("value", dials[j].url);
			labelGroup.setAttribute("value", group.name);
			
			labelTitle.setAttribute("crop", "center");
			labelUrl.setAttribute("crop", "center");
			labelGroup.setAttribute("crop", "center");
			
			row.appendChild(labelTitle);
			row.appendChild(labelUrl);
			row.appendChild(labelGroup);
			
			elem.appendChild(checkbox);
			imgHbox.appendChild(image);
			elem.appendChild(imgHbox);
			elem.appendChild(row);
			
			if ( dials[j]._existsInDb ) {
				elem.setAttribute("disabled", true);
				checkbox.setAttribute("disabled", true);
				
				var screamerImage = document.createElement("image");
				screamerImage.setAttribute("class", "sdIconImage screamer");
				elem.setAttribute("tooltiptext", fvd_speed_dial_FVDSSDToolbarProperties.getString("fvd.toolbar", "migrate_dial_in_db"));
				
				
				imgHbox.appendChild(screamerImage);
			}
			else {
				(function(elem, checkbox){
					elem.onclick = function(event){
						checkbox.checked = !checkbox.checked;
						setupButtons();
						event.stopPropagation();
					}
				})(elem, checkbox);
			}
			
			
			container.appendChild(elem);
			
			var separator = document.createElement("separator");
			separator.setAttribute("class", "groove");
			
			container.appendChild(separator);
		}
		
		
		
	}
	else if( stepIndex == 3 ){
		var dialsGroups = {};
		var totalImportObjects = 0;
		var addonId = document.getElementById("addonId").value;
		
		var dialsCheckboxes = document.getElementsByClassName( "dialCheckbox" );
		for( var i = 0; i != dialsCheckboxes.length; i++ ){
			if( dialsCheckboxes[i].checked ){
				if(dialsCheckboxes[i].getAttribute("value")){
					var tmp = dialsCheckboxes[i].getAttribute("value").split( "_" );
					if( tmp.length == 2 ){
						if( !dialsGroups[tmp[0]] ){
							dialsGroups[tmp[0]] = [];
						}
						dialsGroups[tmp[0]].push( lastDialsList[tmp[0]][tmp[1]] );
						totalImportObjects++;
					}
				}
			}
		}
		
		var needCreateGroups = {};
		
		for( var groupId in dialsGroups ){
			var group = lastGroupsList[ groupId ];
			// check group exists
			var exists = false;
			for( var toGroupId in needCreateGroups ){
				if( needCreateGroups[toGroupId].toLowerCase() == group.name.toLowerCase() ){
					dialsGroups[toGroupId] = dialsGroups[toGroupId].concat( dialsGroups[groupId] );
					delete dialsGroups[groupId];
					exists = true;
					break;
				}
			}
			
			if( exists ){
			 	continue;
			}
			
			needCreateGroups[groupId] = group.name;
		}
		
		setProgress( 0, totalImportObjects );
		
		var groupIndexesIds = {}; // associate group indexes and DB group ids
		
		var speedDial = speedDialSSD;
		
		for( var k in needCreateGroups ){
			// create groups if need
			var groupId;
			groupId = speedDial.storage.groupIdByName( needCreateGroups[k] );
			if( groupId === false ){
				groupId = speedDial.storage.addGroup( needCreateGroups[k] );
			}
			groupIndexesIds[k] = groupId;
		}
		
		var importedItems = 0;
		
		var ios = Components.classes["@mozilla.org/network/io-service;1"].  
		          getService(Components.interfaces.nsIIOService);  
		
		var groupsArray = [];
		
		for (var groupIndex in dialsGroups) {
			var groupId = groupIndexesIds[groupIndex];
			groupsArray.push( {
				groupId: groupId,
				groupIndex: groupIndex
			} );
		}		
		
		var dialsFromGroup = null; 
		var groupId = null;
		
		importInProgress = true;
				
		var importNextDial = function(){	
				
			if( dialsFromGroup == null || dialsFromGroup.length <= 0 ){
				if( groupsArray.length <= 0 ){
					return;
				}
				var nextGroup = groupsArray.shift();
				dialsFromGroup = dialsGroups[nextGroup.groupIndex];
				groupId = nextGroup.groupId;
			}
									
			var dial = dialsFromGroup.shift();				
			
			var thumbSourceType = null;
			var thumbUrl = null;
			
			try{
				
				if( dial.previewInfo.localFile ){
					
					// check local file exists
					
					if( fvd_speed_dial_Misc.fileExists( dial.previewInfo.localFile ) ){
						thumbSourceType = "local_file";
						thumbUrl = dial.previewInfo.localFile;
					}
					else{
						dump( "File not exists.("+dial.previewInfo.localFile+")\n" );
					}
					
				}
				
			}
			catch( ex ){
				dump( ex + "\n" );
			}
			
			dump( "Add: " + thumbSourceType + ": " + thumbUrl + "\n" );
			
			var dialId = speedDial.storage.add( dial.url, dial.title, thumbSourceType, thumbUrl, groupId, 1, 1, speedDial.storage.DELAY_DEFAULT, speedDial.storage.DISABLE_PLUGINS_DEFAULT );
			
			if( dialId ){
				
				
				/*		
				 * NO GET IMAGE FROM DIAL ADDON. OUR SCREEN SYSTEM IS BETTER THAN ALL. ;)
				 * 		
				// try get image
				var file = fvd_speed_dial_FVDSDSingleMMigrate.getImageFile( addonId, dial );				
				if( file ){
					
					var grabber = new SpeedDialSSDPageGrabber( dial.url, dialId );
					
					var URL = ios.newFileURI(file); 
					grabber.forceScreen = URL.spec;
					grabber.noGrabTitle = true;
					
					(function( grabber, dialId, speedDial ){
						grabber.grab( function( fileName, title, grabber ){
							try{
								if( !grabber.failed ){
									speedDial.storage.updateDialData( dialId, {
										thumb_src: dialId
									} );										
								}
							}
							catch(ex){
								
							}
							finally{
								importedItems++;
								setProgress(importedItems, totalImportObjects);
								grabber.destroy();
							}
						} );
					})( grabber, dialId, speedDial );
					

				}
				else{
					importedItems++;
					setProgress(importedItems, totalImportObjects);
				}
				*/
				
				
				
				
				importedItems++;
				setProgress(importedItems, totalImportObjects);
				
				setTimeout( function(){
					importNextDial();
				}, 0 );
			}									
				
			
		}
		
		importNextDial();
		
			

	}
	
	setupButtons();

}

function copyDialImageTo( file, dialId ){
	try{
		var toDir = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties).get('ProfD', Components.interfaces.nsIFile);
		toDir.append( speedDialSSD.STORAGE_FOLDER );
		if( !toDir.exists() ){
			toDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);
		}
		toDir.append( speedDialSSD.SPEED_DIAL_SCREENSHOTS_DIRECTORY );	
		if( !toDir.exists() ){
			toDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);
		}
		
		file.copyTo( toDir, dialId + ".png" );
	}
	catch( ex ){
		
	}

}

function setProgress( imported, needImport ){
	document.getElementById( "importProgress" ).setAttribute("value", Math.round( imported/needImport * 100 ));
	
	var msg = document.getElementById( "importSuccessMessage" );
	msg.setAttribute( "value", fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "migrate_import_finished" ).replace("{URLS}", imported) );
	msg.setAttribute( "hidden", imported != needImport );
	
	if( imported == needImport ){
		observer.notifyObservers(null, "FVD.Toolbar-SD-Dial-Force-Rebuild", null);			
		
		var prevButton = document.getElementById("btnPrevStep");
		var closeButton = document.getElementById( "btnClose" );
		
		prevButton.setAttribute( "hidden", false );
		prevButton.setAttribute( "disabled", false );
		closeButton.setAttribute( "hidden", false );
		closeButton.setAttribute( "disabled", false );
		
		importInProgress = false;
	}
}

function abortImport(){
	
	var allow = true;
	
	if( importInProgress ){
		var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
			                  				 	  .getService(Components.interfaces.nsIPromptService);
		
		var r = promptService.confirm( window, 
							 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "confirm.abort_migrate.title"),
							 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "confirm.abort_migrate.text"));
		if( !r ){
			allow = false;			
		}
	}
	
	if( allow ){
		observer.notifyObservers(null, "FVD.Toolbar-SD-Dial-Force-Rebuild", null);	
		window.close();
	}
	
}

function init(){
	
	var Ci = Components.interfaces;
	var xulWin = window.QueryInterface(Ci.nsIInterfaceRequestor)
	   .getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShellTreeItem)
	   .treeOwner.QueryInterface(Ci.nsIInterfaceRequestor)
	   .getInterface(Ci.nsIXULWindow);
	xulWin.zLevel = xulWin.raisedZ;	
	
	// fill addons list
	var addons = fvd_speed_dial_FVDSDSingleMMigrate.foundAddons;
	if( addons.length <= 0 ){
		window.close();
	}
	
	var container = document.getElementById( "addonsList" );
	
	for( var i = 0; i != addons.length; i++ ){
		var addon = addons[i];
		var radio = document.createElement( "radio" );
		var hbox = document.createElement( "hbox" );
		var vbox = document.createElement( "vbox");
						
		hbox.appendChild( radio );
		
		(function( addon, hbox ){
			hbox.onclick = function(){
				document.getElementById("addonId").value = addon;				
				setupButtons();			
			}
		})( addon, hbox );
		
		var countsData = fvd_speed_dial_FVDSDSingleMMigrate.getCountData( addon );
		var countsLabel = document.createElement( "label");
		countsLabel.setAttribute( "class", "title" );
		var tpl = fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "migrate_group_details_tpl" );
		countsLabel.setAttribute( "value", tpl.replace("{GROUPS}", countsData.groups).replace("{DIALS}", countsData.dials) );
		
		var titleLabel = document.createElement( "label");				
		titleLabel.setAttribute( "value", fvd_speed_dial_FVDSDSingleMMigrate.migrateAddonsData[ addon ].name );
		titleLabel.setAttribute( "class", "title" );
		
		var image = document.createElement( "image" );
		image.setAttribute("class", "addonIcon " + fvd_speed_dial_FVDSDSingleMMigrate.getImageClassForAddonBigIcon(addon) );
		
		
		
		vbox.appendChild( titleLabel );
		vbox.appendChild( countsLabel );
		
		radio.setAttribute( "value", addon );
		var imgVbox = document.createElement("vbox");
		imgVbox.setAttribute("pack", "center");
		imgVbox.appendChild( image );
		
		hbox.appendChild( imgVbox );
		hbox.appendChild( vbox );	
		
		var separator = document.createElement("separator");	
		separator.setAttribute("class", "groove");
		
		container.appendChild( hbox );
		container.appendChild( separator );
	}
	
	setupStep();
	
}

function toNextStep(){
	prevStepIndex = stepIndex;
	stepIndex++;
	setupStep();
}

function toPrevStep(){
	prevStepIndex = stepIndex;
	stepIndex--;
	setupStep();
}

window.addEventListener( "load", function(){
	init();
}, true );
