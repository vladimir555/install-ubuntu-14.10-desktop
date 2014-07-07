FVDSDSSDTextColorAdjuster = {
	
	stylesheets: [],
	
	fontWeight: function( bolder ){
		if( bolder ){
			return "bold";
		}
		return "normal";
	},
	
	adjust: function(){		
		if( this.stylesheets.length == 0 ){
			return;
		}

		// get colors from settings
		var classesColors = {
			".textColorCellTitle": {
				"color": fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.text.cell_title.color"),
				"font-size": fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.text.cell_title.size"),
				"font-weight": this.fontWeight(fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.text.cell_title.bolder"))
			},
			".textColorCellUrl": {
				"color": fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.text.cell_url.color"),
				"font-size": fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.text.cell_url.size"),
				"font-weight": this.fontWeight(fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.text.cell_url.bolder"))
			},
			".textColorListElem": {
				"color": fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.text.list_elem.color"),
				"font-size": fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.text.list_elem.size"),
				"font-weight": this.fontWeight(fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.text.list_elem.bolder"))
			},
				
			".textColorShowUrlTitle": {
				"color": fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.text.list_show_url_title.color"),						
				"font-size": fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.text.list_show_url_title.size"),
				"font-weight": this.fontWeight(fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.text.list_show_url_title.bolder"))
			},

			".textColorListLink":{
				"color": fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.text.list_link.color"),						
				"font-size": fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.text.list_link.size"),
				"font-weight": this.fontWeight(fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.text.list_link.bolder"))
			},
			".textColorOther": {
				"color": fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.text.other.color"),						
				"font-size": fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.text.other.size"),
				"font-weight": this.fontWeight(fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.text.other.bolder"))
			},
			".sd_cell": {
				"opacity": fvd_speed_dial_gFVDSSDSettings.getIntVal("sd.dials_opacity")/100
			},
			".sd_list_elem":{
				"opacity": fvd_speed_dial_gFVDSSDSettings.getIntVal("sd.dials_opacity")/100
			},
			".topMenuLine .group":{
				"opacity": fvd_speed_dial_gFVDSSDSettings.getIntVal("sd.dials_opacity")/100
			}
		};
		
		if( fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.hide_background") ){
			classesColors[".sd_cell .preview_parent"] = {
				"border-color": "transparent",
				"background": "none"
			};
			classesColors[".sd_cell .preview_parent stack"] = {
				"background": "none"
			};
			classesColors[".sd_cell .bottomShadow"] = {
				"visibility": "hidden"
			};
			
			classesColors['.sd_cell[pluscell="1"] .preview_parent stack'] = {
				"background": "none !important"
			};
			
			classesColors['.sd_cell:hover .preview_parent'] = {
				"border-color": "transparent"
			};			
		}
		else{
			classesColors[".sd_cell .preview_parent"] = {
		
			};
			classesColors[".sd_cell .preview_parent stack"] = {

			};
			classesColors[".sd_cell .bottomShadow"] = {

			};
			classesColors['.sd_cell[pluscell="1"] .preview_parent stack'] = {

			};
			classesColors['.sd_cell:hover .preview_parent'] = {

			};			
		}
		
		if( !fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.fvd_sd_show_clicks_and_quick_menu") ){
			classesColors['.sd_cell .cell_header2'] = {
				"display": "none !important"
			};
		}
		else{
			classesColors['.sd_cell .cell_header2'] = {
		
			};			
		}
		
		for( var si = 0; si != this.stylesheets.length; si++ ){
			var stylesheet = this.stylesheets[si];
			for( var i = 0; i != stylesheet.cssRules.length; i++ ){
				var rules = stylesheet.cssRules[i];
				
				if( typeof classesColors[rules.selectorText] != "undefined" ){
					rules.style.cssText = "";		
					for( var propertyName in classesColors[rules.selectorText] ){
						var v = classesColors[rules.selectorText][propertyName];
						var important = null;
						
						if( typeof v == "string" && v.indexOf("!important") != -1 ){
							v = v.replace("!important", "");
							important = "important";
						}
						
						rules.style.setProperty(propertyName, v,  important);
						
					}					
				}
			}
		}
		

	}
	
}
