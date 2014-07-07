Components.utils.import("resource://fvd.speeddial.modules/screen_maker.js");
Components.utils.import("resource://fvd.speeddial.modules/properties.js");



try
{
	// try import addon manager for extension version detection in firefox4
	Components.utils.import("resource://fvd.speeddial.modules/addonmanager.js");

} catch (e) {}


Components.utils.import("resource://fvd.speeddial.modules/sync.js");
Components.utils.import("resource://fvd.speeddial.modules/misc.js");
Components.utils.import("resource://fvd.speeddial.modules/settings.js");
Components.utils.import("resource://fvd.speeddial.modules/newsletter.js");
Components.utils.import("resource://fvd.speeddial.modules/themes.js");
Components.utils.import("resource://fvd.speeddial.modules/poweroff.js");
Components.utils.import("resource://fvd.speeddial.modules/premiumforshare.js");

var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
var observer = Components.classes['@mozilla.org/observer-service;1'].getService(Components.interfaces.nsIObserverService);


var observeEvents = [
	"FVD.Toolbar-SD-Group-Removed"
];

// setup observation

var observeStruct = {
	
	observe: function( subject, topic, data ){
		
		if( topic == "FVD.Toolbar-SD-Group-Removed" ){
			
			// group removed - need rebuild groups listing
			fvds.rebuildGroupsList();
			
		}
		
	}
	
};

observeEvents.forEach(function( event ){
	
	observer.addObserver( observeStruct, event, false );
	
});

window.addEventListener( "unload", function(){
	
observeEvents.forEach(function( event ){
	
	observer.removeObserver( observeStruct, event );
	
});

	
} );



var PoweroffSetup = new function(){
	
	var self = this;
	
	var prefListener = new function(){
		
		this.observe = function( aSubject, aTopic, aData ){
			switch (aTopic) {
				case 'nsPref:changed':
					
					if( aData == "poweroff.enabled" ){
						refresh();
					}
					
				break;
			}
		};
		
	};
		
	function refresh(){
		
		var tabHeadChangePass = document.getElementById( "poweroffTabs_changePass" );
		var tabHeadRestore = document.getElementById( "poweroffTabs_restore" );	
		var mainDeck = document.getElementById("poweroffEnterPassDeck");
		
		if( fvd_sd_PowerOff.isEnabled() ){
			tabHeadChangePass.removeAttribute("hidden");
			tabHeadRestore.removeAttribute("hidden");		
			mainDeck.setAttribute("selectedIndex", 1);
			document.getElementById( "currentPowerOffEmail" ).setAttribute("value", fvd_sd_PowerOff.getEmail());
		}
		else{
			tabHeadChangePass.setAttribute("hidden", true);
			tabHeadRestore.setAttribute("hidden", true);			
			mainDeck.setAttribute("selectedIndex", 0);	
			
			document.getElementById( "poweroffTabs" ).selectedIndex = 0;		
		}
		
	}
	
	function setError( id, text ){
		var label = document.getElementById( id );
		label.setAttribute( "appear", 1 );		
				
		label.setAttribute( "value", fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "poweroff.setup.error." + text ) );
	}
	
	function removeErrors(){
		
		var errors = document.querySelectorAll( "#panePoweroff .error" );
		for( var i = 0; i != errors.length; i++ ){
			errors[i].removeAttribute( "appear" );
		}
		
	}
	
	this.createPassCode = function(){
		
		removeErrors();		
		
		var passCode = document.getElementById( "poweroff_passcode" ).value.trim();
		var passCodeRepeat = document.getElementById( "poweroff_passcode_repeat" ).value.trim();		
		var passCodeEmail = document.getElementById( "poweroff_recovery_email" ).value.trim();				
		
		if( !passCode || !passCodeRepeat ){
			setError( "poweroff_errorCreatePassCode", "empty_pass_code" );
			return;			
		}
		if( passCode != passCodeRepeat ){
			setError( "poweroff_errorCreatePassCode", "pass_code_dont_match" );
			return;			
		}
		
		if( !passCodeEmail || !fvd_speed_dial_Misc.validateText( "email", passCodeEmail ) ){
			setError( "poweroff_errorCreatePassCode", "email_in_wrong_format" );
			return;
		}
		
		fvd_sd_PowerOff.setup( passCodeEmail, passCode );
		
		document.getElementById( "poweroff_passcode" ).value = "";
		document.getElementById( "poweroff_passcode_repeat" ).value = "";		
		document.getElementById( "poweroff_recovery_email" ).value = "";	
		
		refresh();
		
	};
	
	this.changePassCode = function(){
		
		removeErrors();
		
		var oldPassCode = document.getElementById( "poweroff_old_passcode" ).value.trim();
		var newPassCode = document.getElementById( "poweroff_new_passcode" ).value.trim();
		
		if( !fvd_sd_PowerOff.checkPassword( oldPassCode ) ){
			setError( "poweroff_errorChangePassCode", "wrong_pass_code" );
			return;
		}
		
		document.getElementById( "poweroff_old_passcode" ).value = "";
		document.getElementById( "poweroff_new_passcode" ).value = "";
		
		if( !newPassCode ){
			return fvd_sd_PowerOff.removePassword();
		}
		
		fvd_sd_PowerOff.changePassword( newPassCode );
		
		promptService.alert( window,
			fvd_speed_dial_FVDSSDToolbarProperties.getString("fvd.toolbar", "poweroff.setup.alert.pass_code_changed.title"),
			fvd_speed_dial_FVDSSDToolbarProperties.getString("fvd.toolbar", "poweroff.setup.alert.pass_code_changed.text") );
		
	};
	
	this.restorePasscode = function(){
		
		removeErrors();
		
		fvd_sd_PowerOff.restorePassword( function( response ){
			
			if( response.error ){
				setError( "poweroff_restorePassCodeError", "error_while_restore_password" );
			}
			else{
				promptService.alert( window,
					fvd_speed_dial_FVDSSDToolbarProperties.getString("fvd.toolbar", "poweroff.setup.alert.pass_code_restored.title"),
					fvd_speed_dial_FVDSSDToolbarProperties.getString("fvd.toolbar", "poweroff.setup.alert.pass_code_restored.text") + "\n" + fvd_sd_PowerOff.getEmail() );
			}
			
		} );
				
	};
	
	window.addEventListener( "load", function(){
		
		refresh();
		
		document.getElementById("poweroff_createPasscode").addEventListener( "command", function(){
			
			self.createPassCode();
			
		}, false );
		
		document.getElementById("poweroff_changePasscode").addEventListener( "command", function(){
			
			self.changePassCode();
						
		}, false );
		
		document.getElementById("poweroff_doRestorePasscode").addEventListener( "command", function(){
			
			self.restorePasscode();
						
		}, false );
		
		fvd_speed_dial_gFVDSSDSettings.addObserver( prefListener );
		
	}, false );
	
	window.addEventListener( "unload", function(){
		
		fvd_speed_dial_gFVDSSDSettings.removeObserver( prefListener );
		
	}, false );
	
};

if( opener.fvd_speed_dial_fvdSSD ){
	var fvd_speed_dial_gFVDSSD = opener.fvd_speed_dial_fvdSSD;
	var fvd_speed_dial_speedDialSSD = opener.fvd_speed_dial_speedDialSSD;
}
else{
	
	var mainWindow = opener.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
	                       .getInterface(Components.interfaces.nsIWebNavigation)
	                       .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
	                       .rootTreeItem
	                       .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
	                       .getInterface(Components.interfaces.nsIDOMWindow);
						   
	var fvd_speed_dial_gFVDSSD = mainWindow.fvd_speed_dial_fvdSSD;
	var fvd_speed_dial_speedDialSSD = mainWindow.fvd_speed_dial_speedDialSSD;
	
}


speedDialSSD = {
	STORAGE_FOLDER: "FVD Toolbar",
	BG_FILE_NAME: "sd_bg.png"
};

var acceptClicked = false;

var prevCustomDialSizeValue = null;

function displayMode(){
	
	if (opener.fvd_speed_dial_speedDialSSD) {

		return opener.fvd_speed_dial_speedDialSSD._displayMode();
		
	}
	else{
		var mode = "top_sites";
	
		mode = fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.display_type");
		
		if( mode == "last_selected" ){
			try{
				mode = fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.display_type_last_selected");
			}
			catch( ex ){
				mode = "top_sites";
			}
		}	
		
		return mode;
	}
			
}

function refreshCustomDialSize( params ){	
	params = params || {};
	
	if( !params.init ){
		if( !fvd_speed_dial_gFVDSSDSettings.getBoolVal( "i_know_about_custom_dials_size" ) ){
			fvd_speed_dial_gFVDSSDSettings.setBoolVal( "i_know_about_custom_dials_size", true )					
		}
	}
	
	// most visited

	document.getElementById("fvd_custom_dial_width_most_visited").value = document.getElementById("customDialSizeScaleMostVisited").value;
		
	var width = document.getElementById("customDialSizeScaleMostVisited").value;
	
	if( prevCustomDialSizeValue == null ){
		prevCustomDialSizeValue = width;
	}

	var height = Math.round( width / fvd_speed_dial_speedDialSSD.CELLS_RATIO );
	
	document.getElementById("customDialSizeMostVisited").value = width + "x" + height;

	// speed dial

	document.getElementById("fvd_custom_dial_width").value = document.getElementById("customDialSizeScale").value;
		
	var width = document.getElementById("customDialSizeScale").value;
	
	if( prevCustomDialSizeValue == null ){
		prevCustomDialSizeValue = width;
	}
	
	var height = Math.round( width / fvd_speed_dial_speedDialSSD.CELLS_RATIO );
	
	document.getElementById("customDialSize").value = width + "x" + height;
	
	var height = Math.round( width / fvd_speed_dial_speedDialSSD.CELLS_RATIO );
	
	document.getElementById("customDialSize").value = width + "x" + height;	
}

function goToMozilla(){
	navigate_url( "https://addons.mozilla.org/en-US/firefox/addon/fvd-synchronizer/" );
	window.close();
}

function _getMainWindow(){
	var mainWindow = opener.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
	                       .getInterface(Components.interfaces.nsIWebNavigation)
	                       .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
	                       .rootTreeItem
	                       .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
	                       .getInterface(Components.interfaces.nsIDOMWindow);
	
   	return mainWindow;
}

function navigate_url(url, event)
{
	var browser = _getMainWindow().getBrowser();
	var tab = browser.addTab(url);
	if (tab) browser.selectedTab = tab;	
};

function changeTheme(){
	
	setTimeout( function(){
		
		var currentTheme = document.getElementById( "activeTheme" ).value;
		var backgroundTitle = fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.themes_help.font_background." + currentTheme );
		document.getElementById("themesHelpBackgrounName").value = backgroundTitle;
		document.getElementById("themesHelpMessage").setAttribute( "visible", "1" );
		
	}, 0 );
	
}

function goToTab( tabId ){
  document.querySelector("prefwindow").showPane(document.getElementById(tabId));
  
	//document.getElementById(tabId).click();
}

function FVD_Settings()
{
	const EXTENSION_GUID = 'fvd.speeddial@calibr.com';
	const SETTINGS_KEY_BRANCH = 'extensions.fvd_speed_dial.';

	var self = this;
	this.registy = null;
	this.bgAdjuster = null;
	this.needGrabBg = false;

	this.manageBlockedDomains = function(){
	  openDialog('chrome://fvd.speeddial/content/dialogs/fvd_sd_manage_blocked.xul', '', 'chrome,titlebar,toolbar,centerscreen,modal');		
	}

	this._bgImageUrl = function(){
		var bgImageType = document.getElementById( "backgroundImageType" ).value;
		
		var fileUrl = "";
		
		switch( bgImageType ){
			case "local_file":
				fileUrl = this.bgGetLocalFileUrl();
			break;
			case "url":
				fileUrl = document.getElementById( "bgImage" ).value;
			break;
		}
		
		return fileUrl;
	}

	this.openSyncSettingsWindow = function(){
		openDialog('chrome://fvd.speeddial/content/dialogs/fvd_sd_sync_settings.xul', '', 'chrome,titlebar,toolbar,centerscreen,dialog=yes');		
	}

	this.refreshPreview = function( getCurrent ){
		if( this.bgAdjuster.elem.boxObject.width == 0){
			setTimeout( function(){
				self.refreshPreview( getCurrent );
			} , 100);
			return;
		}
		
		if( document.getElementById( "enableBgColor" ).checked ){
			this.bgAdjuster.color = document.getElementById( "bgColor" ).value;					
		}
		else{
			this.bgAdjuster.color = this.bgAdjuster.defaultColor;					
		}
		
		var fileUrl;
		
		if( getCurrent ){
			fileUrl = this.bgAdjuster.currentBgUrl();
		}
		else{
			fileUrl = this._bgImageUrl();
		}
		
		
		this.bgAdjuster.image = fileUrl;
		this.bgAdjuster.imageLocationType = document.getElementById("fvd_sd_bg_type").value;
		
		
		this.bgAdjuster.adaptiveSize = {
			width: window.screen.width,
			height: window.screen.height - 140
		};
		
		this.bgAdjuster.adjust();
	}

	this.fontColorsRestoreDefault = function(){
		var prefsToReset = [
			"fvd_sd_text_cell_title_color",
			"fvd_sd_text_cell_title_bolder",
			"fvd_sd_text_cell_title_size",
			
			"fvd_sd_text_cell_url_color",
			"fvd_sd_text_cell_url_bolder",
			"fvd_sd_text_cell_url_size",
			
			"fvd_sd_text_list_elem_color",
			"fvd_sd_text_list_elem_bolder",
			"fvd_sd_text_list_elem_size",
			
			"fvd_sd_text_list_show_url_title_color",
			"fvd_sd_text_list_show_url_title_bolder",
			"fvd_sd_text_list_show_url_title_size",
			
			"fvd_sd_text_list_link_color",
			"fvd_sd_text_list_link_bolder",
			"fvd_sd_text_list_link_size",
			
			"fvd_sd_text_other_color",
			"fvd_sd_text_other_bolder",
			"fvd_sd_text_other_size"		
		];
		
		var selectedTheme = document.getElementById("fvd_sd_active_theme").value;
		
		var defaults = fvd_speed_dial_Themes.themesDefaults[ selectedTheme ];
		
		dump( "Defaults is " + defaults + "( "+selectedTheme+" )\n" );
		
		for( var i = 0; i != prefsToReset.length; i++ ){
			try{		
				var pref = document.getElementById(prefsToReset[i]);
				var relativeName = fvd_speed_dial_gFVDSSDSettings.relativeName( pref.getAttribute( "name" ) );
				if( defaults && defaults[relativeName] ){
					pref.value = defaults[relativeName];
				}
				else{
					pref.reset();									
				}
			}
			catch( ex ){
				
			}

		}
	}
	
	this.refreshDisplayMode = function(){
		/*
		var mv = document.getElementById("customDialSizeScaleMostVisited");
		var sd = document.getElementById("customDialSizeScale");		

		mv.setAttribute( "hidden", true );
		sd.setAttribute( "hidden", true );		
		
		if( displayMode() == "most_visited" ){
			mv.removeAttribute( "hidden" );
		}
		else{
			sd.removeAttribute( "hidden" );			
		}
		
		refreshCustomDialSize();
		*/
		
	}

  this.showShareForPremium = function() {    
    navigate_url("chrome://fvd.speeddial/content/fvd_about_blank.html#share-for-premium");
    window.close();
  };

	this.init = function()
	{	
		var btn = document.querySelector("prefwindow").getButton("extra1");
		btn.className += " button-star";
		btn.setAttribute("hidden", true);
    fvd_sd_PremiumForShare.allowShow({
      ignoreDisplayed: true
    }, function(allow) {
      if(!allow){
        return;
      }
      btn.removeAttribute("hidden");  
      setTimeout(function(){
        btn.style.opacity = 1;
      }, 100);
    });
    
		//scale element not inherit value from associated preference. set value manually
		document.getElementById("scale_fvd_sd_dials_opacity").value = fvd_speed_dial_gFVDSSDSettings.getIntVal("sd.dials_opacity");
		document.getElementById("customDialSizeScale").value = fvd_speed_dial_gFVDSSDSettings.getIntVal("sd.custom_dial_width");
		document.getElementById("customDialSizeScaleMostVisited").value = fvd_speed_dial_gFVDSSDSettings.getIntVal("sd.custom_dial_width_mostvisited");
		
		refreshCustomDialSize( {
			init: true
		} );
		
		document.getElementById("customDialSizeScale").addEventListener( "change", function(){
			refreshCustomDialSize();
		}, false );
		
		document.getElementById("customDialSizeScaleMostVisited").addEventListener( "change", function(){
			refreshCustomDialSize();
		}, false );
		
		// set current main button state value

		document.getElementById("fvdsd_display_main_button").checked = gFVDSSD.main_button_in_toolbar();		

		try{
			Components.utils.import('chrome://fvd.speeddial/content/include/sd/m_migrate.js');
			var migrateGroup = document.getElementById( "migrateGroup" );
			migrateGroup.setAttribute( "hidden", fvd_speed_dial_FVDSDSingleMMigrate.foundAddons.length == 0 );
		}
		catch( ex ){
			
		}

		

		
		// set dimension label value
		var label = document.getElementById( "currentBgDimension" );
		var dim = window.screen.width + "x" + window.screen.height;
		
		label.setAttribute( "value", fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "dialog.settings.current_dimensions" ).replace("{DIM}", dim) );
		
		this.bgAdjuster = new FVDSDSSDBackgroundAdjuster();
		this.bgAdjuster.elem = document.getElementsByClassName( "bgPreview" )[0].getElementsByTagName("vbox")[0];
		
		this.changeBGImageType();
		
		this.backgroundTypeChange();
		

		
		//init colorpicker
		try{
			FVDColorPicker.start( "chrome://fvd.speeddial/content/include/html_components/colorpicker/component.html" );	
			FVDColorPicker.assign( document.getElementById("bgColor"), function( c ){

				document.getElementById("fvd_sd_bg_enable_color").value = true;
				
				fvds.refreshPreview();
			} );
			
			var textColorCallback = function( c, elem ){
				// change pref value online
				
				if( !elem ){
					return;
				}
				
				FVDSSDMisc.runProcess( "changeTextColorSetting", function(){
					document.getElementById(elem.getAttribute("preference")).value = c;									
				} );
			};
			
			FVDColorPicker.assign( document.getElementById("sdTextColorCellTitle"), textColorCallback, textColorCallback, textColorCallback );	
			FVDColorPicker.assign( document.getElementById("sdTextColorCellUrl"), textColorCallback, textColorCallback, textColorCallback  );	
			FVDColorPicker.assign( document.getElementById("sdTextColorListElem"), textColorCallback, textColorCallback, textColorCallback  );		
			FVDColorPicker.assign( document.getElementById("sdTextColorListShowUrlTitle"), textColorCallback, textColorCallback, textColorCallback  );	
			FVDColorPicker.assign( document.getElementById("sdTextColorListLinks"), textColorCallback, textColorCallback, textColorCallback  );	
			FVDColorPicker.assign( document.getElementById("sdTextColorOther"), textColorCallback, textColorCallback, textColorCallback  );
		}
		catch( ex ){
			//alert(ex);
		}


		/*
		var Ci = Components.interfaces;
		var xulWin = window.QueryInterface(Ci.nsIInterfaceRequestor)
		   .getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShellTreeItem)
		   .treeOwner.QueryInterface(Ci.nsIInterfaceRequestor)
		   .getInterface(Ci.nsIXULWindow);
		xulWin.zLevel = xulWin.raisedZ;	
		*/
		
		if( window.arguments && window.arguments[0].pane ){
			
			switch( window.arguments[0].pane ){
				
				case "change_custom_size":
				
					document.documentElement.showPane( document.getElementById("paneSdGlobal") );
					document.getElementById("globalTabs").selectedIndex = 1;
					
					document.getElementById("groupBoxSetupCustomSize").setAttribute("highlight", 1);
					document.getElementById("groupBoxSetupCustomSizeMostVisited").setAttribute("highlight", 1);
								
				break;
				
				default:
					document.documentElement.showPane( document.getElementById(window.arguments[0].pane) );					
				break;
								
			}
			

					
		}

		document.getElementById("sd_make_home_page").checked = fvd_speed_dial_gFVDSSDSettings.sdIsHomepage();
	
		sdEnableClick();
		

		
		// init subpanes
		
		this.rebuildGroupsList();
		
		/*
		
		var subPaneContainer = document.getElementsByClassName("subPane")[0];
		
		var childs = subPaneContainer.childNodes;
		var defaultId = "";
		
		if( !window.arguments ){
			window.arguments = [{}];
		}
		if( !window.arguments[0].subpane ){
			var defPane = fvd_speed_dial_gFVDSSDSettings.getStringVal( "sd.settings_last_menu" );
			if( defPane ){
				window.arguments[0].subpane = defPane;
			}			
		}
		
		for( var i = 0; i != childs.length; i++ ){
			var subPane = childs[i];
			
			if( subPane.className.indexOf( "sdGetSatisfaction" ) != -1 || subPane.className.indexOf( "sdDonate" ) != -1 ){
				continue;
			}
						
			(function(subPane, childs){
				subPane.onclick = function(){
					
					fvd_speed_dial_gFVDSSDSettings.setStringVal( "sd.settings_last_menu", subPane.id );
					
					for(var j = 0; j != childs.length; j++){
						if( subPane == childs[j] ){
							childs[j].setAttribute( "active", "1" );
						}
						else{
							childs[j].setAttribute( "active", "0" );							
						}
					}
					
					var items = document.getElementsByClassName("subPaneItem");
					for( var j = 0; j != items.length; j++ ){
						if( items[j].getAttribute("for") == subPane.id ){
							items[j].setAttribute("hidden", false);
						}
						else{
							items[j].setAttribute("hidden", true);							
						}
					}
				}
				
				if( window.arguments && window.arguments[0].subpane ){
					if( subPane.id == window.arguments[0].subpane ){
						subPane.onclick();
					}
				}
				else{
					if( subPane.getAttribute("default") === "1" ){
						subPane.onclick();
					}
				}
				

			})(subPane, childs);
		}
		
		*/
		
		
		
		
		// init image helpers
		FVDPopupImageHelper.assignByClass();

		fvds.refreshPreview( true );
		
		if( window.arguments[0].evaluate ){
			window.arguments[0].evaluate( document );
		}
		
		this.refreshHotKeyActivity();
		
		var prefwindow = document.getElementsByTagName("prefwindow")[0];
		
		try{
			var suggestButton = document.getAnonymousElementByAttribute( prefwindow, "pane", "suggestionsButton" );			
			
			suggestButton.addEventListener( "mousedown", function( event ){				
				fvds.openSuggestionPopup();	

				event.stopPropagation();
				event.preventDefault();	
			}, false );

		}
		catch( ex ){
			
		}
		
		try{
			var donateButton = document.getAnonymousElementByAttribute( prefwindow, "pane", "donateButton" );			
									
			donateButton.addEventListener( "mousedown", function( event ){				
				fvds.openDonatePanel();	
				
				event.stopPropagation();
				event.preventDefault();	
			}, false );
		}
		catch( ex ){
			
		}
		
		// prevent selecting some panes
		prefwindow.addEventListener( "click", function( event ){
		
		    if (event.originalTarget.getAttribute("pane") == "suggestionsButton" || event.originalTarget.getAttribute("pane") == "donateButton") {
				event.stopPropagation();
				event.preventDefault();
		    }
			
		}, true );
		

		
		this.refreshDisplayMode();
		
		if( fvd_speed_dial_Sync.fvdSynchronizerAvailable() ){
			document.getElementById("syncDeck").selectedIndex = 0;
			
			document.getElementById("startSync").addEventListener( "command", function(){
				fvd_speed_dial_Sync.openSettings( "syncTabs_speeddial", null, null, window );
				window.close();
			} );			
		}
		else{
			document.getElementById("syncDeck").selectedIndex = 1;			
		}
		
		document.getElementById("localFilePath").addEventListener( "input", function(){
			
			self.disableBackgroundColor();			
			
		}, false );
		document.getElementById("bgImage").addEventListener( "input", function(){

			self.disableBackgroundColor();
			
		}, false );
		
	};
	
	this.disableBackgroundColor = function(){
	
		document.getElementById("enableBgColor").checked = false;
		
	}

	this.rebuildGroupsList = function(){
		var groups = storage.getGroupsList();
		var container = document.getElementById( "group" ).getElementsByTagName("menupopup")[0];
		
		while( container.firstChild ){
			container.removeChild( container.firstChild );
		}
		
 		var menuItem = document.createElement( "menuitem" );
		menuItem.setAttribute( "label", fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.last_selected_group.title" ) );
		menuItem.setAttribute( "value", "-1" );	
		container.appendChild( menuItem );
		
		if( document.getElementById("cb_fvd_sd_enable_popular_group").checked ){
			menuItem = document.createElement( "menuitem" );
			menuItem.setAttribute( "label", fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.all_group.title" ) );
			menuItem.setAttribute( "value", "all" );	
			container.appendChild( menuItem );
		}
		
		
		for( var i = 0; i != groups.length; i++ ){
			var menuItem = document.createElement( "menuitem" );
			menuItem.setAttribute( "label", groups[i].name );
			menuItem.setAttribute( "value", groups[i].id );	
			container.appendChild( menuItem );
		}
		
		document.getElementById( "group" ).value = document.getElementById("fvd_sd_default_group").value;
	}

	this.manageGroups = function(){
		openDialog('chrome://fvd.speeddial/content/dialogs/fvd_sd_manage_groups.xul', '', 'chrome,titlebar,toolbar,centerscreen,modal');
	}
	
	this.changeBGImageType = function( type ){
		if( !type ){
			type = document.getElementById("backgroundImageType").value;
		}
		
		document.getElementById( "bgLocalFileBox" ).setAttribute( "hidden", true );
		document.getElementById( "bgUrlBox" ).setAttribute( "hidden", true );
		
		if( type == "local_file" ){
			document.getElementById( "bgLocalFileBox" ).setAttribute( "hidden", false );		
		}
		else if( type == "url" ){
			document.getElementById( "bgUrlBox" ).setAttribute( "hidden", false );
		}
	}
	
	this.pickScreenLocalFile = function(  ){
		var nsIFilePicker = Components.interfaces.nsIFilePicker;
		var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
		fp.init(window, null, nsIFilePicker.modeOpen);
		fp.appendFilters(nsIFilePicker.filterImages);
			
		var res = fp.show();
		if (res == nsIFilePicker.returnOK){
			document.getElementById( "localFilePath" ).value = fp.file.path;	 
			this.refreshPreview();
			this.disableBackgroundColor();
		}
	}
	
	this.wrongFileMessage = function(){
		var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
		                              				  .getService(Components.interfaces.nsIPromptService);
		promptService.alert( window, 
							 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "alert.sd_url_deny.wrong_image"),
							 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "alert.sd_url_deny.text") );
	}

	this.bgGetLocalFileUrl = function(){		
		
		try{
			
			if (fvd_speed_dial_Misc.appVersion() < 13) {
				var localFile = Components.classes["@mozilla.org/file/local;1"]
			                			  .createInstance(Components.interfaces.nsILocalFile);	
			}
			else{
				var localFile = Components.classes["@mozilla.org/file/local;1"]
			                			  .createInstance(Components.interfaces.nsIFile);	
			}
									  
									  	
			localFile.initWithPath( document.getElementById("localFilePath").value );
			if( !localFile.isFile() ){
				// display wrong file message
				throw new Exception( "err" );
			}
			
			return FVDSSDMisc.fileToURI( localFile );			  
		}
		catch( ex ){
			//this.wrongFileMessage();			
			return "";
		}
	
	}

	this.backgroundTypeChange = function(){
		
	
		document.getElementById( "backgroundImageType" ).setAttribute( "hidden", document.getElementById( "bgType" ).value == "no_image" );

	}

	this.ok = function(event, accept)
	{
		
		var osString = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime).OS;  
		
		//if( osString == "Darwin" || osString == "Linux" ){
			//always accept
			accept = true;
		//}
		
		if( accept ){
			
			// set adult status
			try{
				var noClose = false;
				
				// save image file
						
								
				fvd_speed_dial_gFVDSSDSettings.setStringVal( "sd.bg.color", document.getElementById("bgColor").value );
				
				document.getElementById( "fvd_sd_bg_file_path" ).valueFromPreferences = document.getElementById("localFilePath").value;
											
				if( this.needGrabBg ){				
					var url = this._bgImageUrl();				
									
					
					if( url != "" ){
						try{
							noClose = true;
							
							function callback(){
								observer.notifyObservers(null, 'FVD.Toolbar-SD-Bg-Force-Refresh', true);	
								
								window.close();
							}							
									
							
							// change button label
							var button = document.getElementById("fvdsd_settings_dialog").getButton( "accept" );
							button.setAttribute( "label", fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "dialog.settings.please_wait") );
							
							fvd_speed_dial_ScreenMaker.make({
								type: "image",
								saveFormat: "asis",
								imageUrl: url,
								originalSize: true,
								fileName: "/" + speedDialSSD.STORAGE_FOLDER + "/" + speedDialSSD.BG_FILE_NAME,
								onSuccess: function(){
									callback();
								},
								onFail: function(){
									callback();
								}								
							});									
						}
						catch( ex ){
				
						}
					}
					
				}
				else{
				  observer.notifyObservers(null, 'FVD.Toolbar-SD-Bg-Force-Refresh', true);
				}
				
				
				fvd_speed_dial_gFVDSSDSettings.setSdAsHomePage( document.getElementById("sd_make_home_page").checked );					
				
				// check main button status
				if( document.getElementById("fvdsd_display_main_button").checked ){
					gFVDSSD.main_button_insert();
				}
				else{
					gFVDSSD.main_button_remove();				
				}
				
				if( noClose ){
					return false;
				}			
			}
			catch(ex){
	
			}
			
		}
		else{
			if( prevCustomDialSizeValue != null ){
				document.getElementById("fvd_custom_dial_width").value = prevCustomDialSizeValue;							
			}
		}

		
		return true;
	};
	
	this.openSuggestionPopup = function(){
		//var button = document.getElementById( "suggestionsButton" );
		try{
			var button = document.getAnonymousElementByAttribute( document.getElementsByTagName("prefwindow")[0], "pane", "suggestionsButton" );		
			
			var menu = document.getElementById( "suggestionsPopup" );
			
			menu.openPopup( button, "after_start", 0, 0, true, false, null );			
		}
		catch( ex ){
			dump( ex + "\n");
		}
	}
	
	this.submitSuggestion = function(){
		var url = "http://fvdmedia.userecho.com/list/21212-everhelper/?category=4906";
		
		var tab = mainWindow.gBrowser.addTab(url);
		mainWindow.gBrowser.selectedTab = tab;		
	}
	

	this.reportBug = function(){
		var url = "http://flashvideodownloader.org/fvd-suite/to/s/speeddial_bug/";
		
		var tab = mainWindow.gBrowser.addTab(url);
		mainWindow.gBrowser.selectedTab = tab;		
	}
	
	this.refreshHotKeyActivity = function(){
		var hotKeyCode = document.getElementById("hotkeyCode");
		if(document.getElementById("useHotKey").checked){
			hotKeyCode.removeAttribute( "disabled" );
		}
		else{
			hotKeyCode.setAttribute( "disabled", true );			
		}
	}
	
	this.hotKeyScan = function( event ){
		var hotKeyCode = document.getElementById("hotkeyCode");
		
		var code = [];
		
		var allowedKeys = "QWERTYUIOP[]ASDFGHJKL;'ZXCVBNM,.1234567890";
		
		if( event.ctrlKey ){
			code.push( "CTRL" );	
		}
		if( event.altKey ){
			code.push( "ALT" );	
		}
		if( event.shiftKey ){
			code.push( "SHIFT" );	
		}	
				
		var letter = String.fromCharCode(event.which).toUpperCase();	
		
		code.push( letter );
		
		if( allowedKeys.indexOf(letter) != -1 ){
			hotKeyCode.value = code.join( " + " );
		}		
		else{
			hotKeyCode.value = "";
		}		
		
		var parsedHotKey = fvd_speed_dial_Misc.parseHotKey( hotKeyCode.value );
		
		if( !parsedHotKey.key ){
			return;
		}
		
		var activeKeys = fvd_speed_dial_Misc.getActiveHotKeys( parsedHotKey.modifiers, parsedHotKey.key );
		
		var foundActiveKey = false;
		activeKeys.forEach( function( key ){
			if( key.getAttribute( "id" ) != "fvd_speed_dial_hotKey" ){
				foundActiveKey = true;
			}
		} );
		
		var keyAlreadyUsedMessage = document.getElementById("hotKeyAlreadyUsed");
		
		if( this.__hideKeyAlreadyUsedMessageTimeout ){
			try{
				clearTimeout( this.__hideKeyAlreadyUsedMessageTimeout );				
			}
			catch( ex ){
				
			}
		}
		
		if( foundActiveKey ){			
			keyAlreadyUsedMessage.removeAttribute( "hidden" );
			
			this.__hideKeyAlreadyUsedMessageTimeout = setTimeout( function(){
				keyAlreadyUsedMessage.setAttribute( "hidden", true );
			}, 5000 );
			
			//document.getElementById("fvd_sd_hot_key").value = "";
		}
		else{
			keyAlreadyUsedMessage.setAttribute( "hidden", true );
			document.getElementById("fvd_sd_hot_key").value = hotKeyCode.value;
		}
		
		
						
		event.preventDefault();		
	}
	
	this.openDonatePanel = function(){
		var panel = document.getElementById("donatePanel");

		var prefwindow = document.getElementsByTagName("prefwindow")[0];
		var donateButton = document.getAnonymousElementByAttribute( prefwindow, "pane", "donateButton" );			
		
		panel.openPopup( donateButton, "after_pointer", 0, 0, false, false, null );
	}
	
	this.donate = function(){
		var tab = mainWindow.gBrowser.addTab( "https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=ZBPEEGEWXNRHU" );
		mainWindow.gBrowser.selectedTab = tab;		
	}
	
	

	window.addEventListener('load', function () {self.init.call(self)}, false);
};

function sdEnableClick(){
	var fields = {
		"enable_top_sites": "top_sites",
		"enable_most_visited": "most_visited",
		"enable_recently_closed": "recently_closed"
	};
	
	var selectedCount = 0;
	var block = false;
	
	for( var k in fields ){
		if( document.getElementById(k).checked ){
			selectedCount++;
			document.getElementById( "sd_default_"+fields[k] ).setAttribute("disabled", false);
		}
		else{
			document.getElementById( "sd_default_"+fields[k] ).setAttribute("disabled", true);
			if( document.getElementById( "sd_default_mode" ).value == fields[k] ){
				document.getElementById( "sd_default_mode" ).selectedIndex = 3;
			}
		}
	}
	
	if( selectedCount == 1 ){
		for( var k in fields ){
			if( !document.getElementById(k).checked ){
				continue;
			}
			document.getElementById(k).setAttribute( "disabled", true );
		}			
	}
	else{
		// enable all
		for( var k in fields ){
			document.getElementById(k).setAttribute( "disabled", false );
		}			
	}

}

var storage;

try{
	Components.utils.import("resource://fvd.speeddial.modules/storage.js");
    storage = fvd_speed_dial_Storage;		
}
catch( ex ){
	//dump( "Fail init storage\r\n" );	
}

var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]  
                   .getService(Components.interfaces.nsIWindowMediator);  
var mainWindow = wm.getMostRecentWindow("navigator:browser");  

var gFVDSSD = mainWindow.fvd_speed_dial_fvdSSD;

var fvds = new FVD_Settings();

window.addEventListener("load", function(){
	
	var els = document.querySelectorAll( "[submitbutton]" );
	for( var i = 0; i != els.length; i++ ){
		(function( el ){
			
			var button = document.getElementById( el.getAttribute( "submitbutton" ) );
			el.addEventListener( "keypress", function( event ){
				
				if( event.keyCode == 13 ){										
					event.preventDefault();		
					event.stopPropagation();
					
					button.click();
				}
		
				
			}, false );
			
		})( els[i] );
	}
	
	
	if( fvd_sd_PowerOff.isHidden() ){
		
		document.getElementById("syncTabs_import_export").setAttribute("hidden", true);
		
	}

	
}, false);
