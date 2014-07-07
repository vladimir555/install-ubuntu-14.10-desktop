gFVDSDSingleMigrate = {
	migrateAppearTimeout: 2000,

	startDisplayMessageTimer: function(){
		
		setTimeout(function(){
			gFVDSDSingleMigrate.displayMigrateMessageIfNeed();
		}, this.migrateAppearTimeout);
		
	},
	
	setMessageListener: function(){		
		//window.addEventListener( "load", function(){			
			gFVDSDSingleMigrate.startDisplayMessageTimer();
		//} );
	},
	
	displayMigrateMessageIfNeed: function(){
		try{
			Components.utils.import('chrome://fvd.speeddial/content/include/sd/m_migrate.js');
			
			/*			
			fvd_speed_dial_FVDSDSingleMMigrate.getGroups( "fastdial@telega.phpnet.us", function( groups ){
				if( groups != null ){
					dump( "Obtained groups list " + groups.length  + "\r\n" );
					
					for( var i = 0; i != groups.length; i++ ){
					
						dump( "FOUND GROUP " + groups[i].name + "\r\n" );
						dump( "Get Group dials...\r\n" );
						
						fvd_speed_dial_FVDSDSingleMMigrate.getDialsList( "fastdial@telega.phpnet.us", groups[i], function( dials ){
							for( var j = 0; j != dials.length; j++ ){
								dump( "DIAL " + dials[j].url + ", " + dials[j].title + "\r\n" );							
							}						
						} );
	
					}
				}
			} );
			*/
						
			// check if not any options displayed. if one of options is displayed, wait until options window closed
			var optionsWindows = parent.document.getElementsByClassName("popupOptions");						
			for( var i = 0; i != optionsWindows.length; i++ ){
				if( optionsWindows[i].getAttribute("active") == 1 ){
					this.startDisplayMessageTimer();
					return false;
				}
			}
			
			var allowMigrate = fvd_speed_dial_FVDSDSingleMMigrate.foundAddons.length > 0;
			var dontDisplayMigrateMessage = fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.dont_display_migrate_message");
			
			if( allowMigrate && !dontDisplayMigrateMessage ){
				// fill addons list
				var list = parent.document.getElementById("importAddonsList");				
				while( list.firstChild ){
					list.removeChild( list.firstChild );
				}
				for( var i = 0; i != fvd_speed_dial_FVDSDSingleMMigrate.foundAddons.length; i++ ){
					var addon = fvd_speed_dial_FVDSDSingleMMigrate.migrateAddonsData[fvd_speed_dial_FVDSDSingleMMigrate.foundAddons[i]];
					var div = parent.document.createElement( "div" );
					var divIcon = parent.document.createElement( "div" )
					divIcon.className = fvd_speed_dial_FVDSDSingleMMigrate.getImageClassForAddonSmallIcon( fvd_speed_dial_FVDSDSingleMMigrate.foundAddons[i] );
					div.className = "addonItem";

					var span = parent.document.createElement("span");
					
					span.textContent = addon.name;
					
					div.appendChild( divIcon );
					div.appendChild( span );
					
					list.appendChild(div);
				}
				
				// display message
				var toElem = parent.document.getElementById( "searchBar" );				
				parent.HtmlSearch.showOptions( "migrateData", toElem );
			}
		}
		catch( ex ){
			//dump( "Cannot display migrate message("+ex+")\r\n" );
		}
	}
}

try{

	if( document.location.href.indexOf("fvd_about_blank.xul") != -1 ){
		gFVDSDSingleMigrate.setMessageListener();
	}
	
}
catch( ex ){
	
}
