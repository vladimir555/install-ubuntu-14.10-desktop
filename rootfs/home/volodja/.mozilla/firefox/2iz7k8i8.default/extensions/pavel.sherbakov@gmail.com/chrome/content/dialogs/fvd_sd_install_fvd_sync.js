Components.utils.import("resource://fvd.speeddial.modules/properties.js");
Components.utils.import("resource://fvd.speeddial.modules/dialogs.js");

var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);	

function _getMainWindow(){
	var mainWindow = opener.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
	                       .getInterface(Components.interfaces.nsIWebNavigation)
	                       .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
	                       .rootTreeItem
	                       .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
	                       .getInterface(Components.interfaces.nsIDOMWindow);
	
   	return mainWindow;
}

var installListener = new function(){
	
	this.onInstallEnded = function(){
		
		var button = fvd_speed_dial_Dialogs.open( {
			window: window,
			buttons: {
				"accept": fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "fvdsync.installed.restart")
			},
			icon: "chrome://fvd.speeddial/skin/sync_icon.png",
			title: fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "fvdsync.installed.title"),
			text: fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "fvdsync.installed.text")
		} );
		
		
		/*
		
		var buttonFlags = (promptService.BUTTON_POS_0) * (promptService.BUTTON_TITLE_IS_STRING); //+(promptService.BUTTON_POS_1) * (promptService.BUTTON_TITLE_IS_STRING); 
		
		var _ = {
			value: false
		};
		
		var button = promptService.confirmEx( window, 
											  fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "fvdsync.installed.title"),
											  fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "fvdsync.installed.text"),
											  buttonFlags,
											   fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "fvdsync.installed.restart"),
											   fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "fvdsync.installed.restart_later"),
											  "",
											  null,
											  _											 
										);
		*/								
		if( button == "accept" ){
			
			var boot = Components.classes["@mozilla.org/toolkit/app-startup;1"].getService(Components.interfaces.nsIAppStartup);
			boot.quit(Components.interfaces.nsIAppStartup.eForceQuit|Components.interfaces.nsIAppStartup.eRestart);
			
		}
		
		window.close();
		
	}
	
}



function navigate_url(url, event)
{
	var browser = _getMainWindow().getBrowser();
	var tab = browser.addTab(url);
	if (tab) browser.selectedTab = tab;	
};

function goToMozilla(){
	
	Components.utils.import('resource://gre/modules/AddonManager.jsm');	
	AddonManager.getInstallForURL( "https://addons.mozilla.org/firefox/downloads/latest/375008/addon-375008-latest.xpi?src=dp-btn-primary", function( addonInstall ){
		
		document.getElementById( "installationDeck" ).selectedIndex = 1;
		
		addonInstall.addListener( installListener );
		addonInstall.install();
		
	}, "application/x-xpinstall" );
	
	
	//navigate_url( "https://addons.mozilla.org/en-US/firefox/addon/fvd-synchronizer/" );
	//window.close();
}
