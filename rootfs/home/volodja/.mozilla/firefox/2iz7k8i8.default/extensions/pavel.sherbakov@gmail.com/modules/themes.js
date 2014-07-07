var EXPORTED_SYMBOLS = ["fvd_speed_dial_Themes"]; 

Components.utils.import("resource://fvd.speeddial.modules/settings.js");

fvd_speed_dial_Themes = new function(){
	
	const STYLESHEET_INDEX = 2;
	
	var self = this;
	
	var prefListener = {
	    observe: function(aSubject, aTopic, aData){		
		
			switch (aTopic) {
				case 'nsPref:changed':					
					
					if( aData == "sd.active_theme" ){
						var toTheme = fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.active_theme");
						var prevTheme = fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.prev_theme");						
												
						if( self.themesDefaults[prevTheme] && self.themesDefaults[toTheme] ){
							for( var prefName in self.themesDefaults[prevTheme] ){
								
								if( !self.themesDefaults[toTheme][prefName] ){
									continue;
								}
								
								var defaultValuePrev = self.themesDefaults[prevTheme][prefName];
								
								if( fvd_speed_dial_gFVDSSDSettings.getStringVal(prefName).toLowerCase() == defaultValuePrev ){
									fvd_speed_dial_gFVDSSDSettings.setStringVal(prefName, self.themesDefaults[toTheme][prefName]);
								}
								
							}
							
							fvd_speed_dial_gFVDSSDSettings.setBoolVal( "sd.bg.enable_color", true );		
						}
						
						fvd_speed_dial_gFVDSSDSettings.setStringVal( "sd.prev_theme", toTheme );								
					}
					
					
					break;
			}
			
		}		
	};	
		
	fvd_speed_dial_gFVDSSDSettings.addObserver( prefListener );	
	
	// for older version fvd didn't save sd.prev_theme
	if( fvd_speed_dial_gFVDSSDSettings.getStringVal( "sd.prev_theme" ) == "" ){
		fvd_speed_dial_gFVDSSDSettings.setStringVal( "sd.prev_theme", fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.active_theme") );
	}
	
	this.themesDefaults = {
		"white":{
			"sd.text.cell_title.color": "#000000",
			"sd.bg.color": "#ffffff",
			"sd.text.list_elem.color": "#000000",
			"sd.text.other.color": "#000000",
			"sd.text.list_show_url_title.color": "#000000"
		},
		"dark":{
			"sd.text.cell_title.color": "#ffffff",
			"sd.bg.color": "#000000",
			"sd.text.list_elem.color": "#ffffff",
			"sd.text.other.color": "#ffffff",
			"sd.text.list_show_url_title.color": "#ffffff"
		}
	};
	
	
	this.setForDocument = function( document, themeName ){
		
		var cssPath = "chrome://fvd.speeddial/skin/sd/skin/dials/themes/"+themeName+"/style.css";
		var rule = "@import url("+cssPath+");";
		
		try{
			document.styleSheets[ STYLESHEET_INDEX ].deleteRule( 0 );
		}
		catch( ex ){

		}
	
		document.styleSheets[ STYLESHEET_INDEX ].insertRule( rule, 0 );			
		
	}
	
	this.changePreparations = function( from, to ){
		
	}
	
	
	
}
