Components.utils.import("resource://fvd.speeddial.modules/properties.js");



function _(msg){
	return fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.search", msg );
}

var HtmlSearch = {
	settingsInvalidated: [],
	settingsInvalidatedIntervalCheck: null,
	
	partPrefs: {},
	allRefreshesSettings: ["speedDial", "mostVisited", "recentlyClosed"],
	
	observer: null,
	
	scrollProgrammaticaly: false,
	onSetup: [], // callbacks if initiated
	
	settings: function(){
		
		return frameWin.fvd_speed_dial_gFVDSSDSettings;		
		
	},

	openOptionsAppearance: function(){
		this.settings().displayWindow( "paneSdGlobal", null, function( d ){
			d.getElementById("globalTabs").selectedIndex = 1;
		} );
	},
	
	setCanTurnNewTabPopupDisplayable: function(v){
		
		var settings = this.settings();
		
		settings.setBoolVal( "sd.display_can_turn_off_newtab", v );
		
	},
	
	displayCanTurnOfNewTabPopup: function(){

		var settings = this.settings();
		
		if( settings.getBoolVal( "sd.display_can_turn_off_newtab" ) ){
			
			this.showOptions( "canTurnOfNewTabPopup", null, null, {
				top: 20,
				left: document.body.clientWidth/2 - document.getElementById("canTurnOfNewTabPopup").offsetWidth/2
			} );
				
		}		
		
	},
	
	setMoveArrows: function( type, event ){
		var moveDialType = document.getElementById( "moveDialType" );
		moveDialType.setAttribute( "type", type );
		
		moveDialType.style.left = event.pageX - moveDialType.offsetWidth/2 + "px";
		moveDialType.style.top = event.pageY + this.frame().offsetTop - moveDialType.offsetHeight - 10 + "px";	
	},
	
	getMoveType: function(){
		return document.getElementById( "moveDialType" ).getAttribute("type");		
	},
	
	scroll: function(){
		if( this.scrollProgrammaticaly ){
			this.scrollProgrammaticaly = false;
			return;
		}
		speedDial.hideAllContextMenus();
	},
	
	scrollByScript: function( ypos ){
		this.scrollProgrammaticaly = true;
		window.scroll( 0, ypos );
	},
	
	checkSettingsInvalidate: function(){
		if( HtmlSearch.settingsInvalidated.length != 0 ){			
			var toRefresh = HtmlSearch.settingsInvalidated;
			HtmlSearch.settingsInvalidated = [];			
			HtmlSearch.refreshSettingsWindow( toRefresh );
		}
	},
	
	mouseOverButton: function( elem ){
		var texts = document.getElementsByClassName( "subText" );
		for( var i = 0; i != texts.length; i++ ){
			if( texts[i].parentNode == elem ){
				continue;
			}
			texts[i].style.display = "none";
		}
	},
	
	mouseOutButton: function(){
		var texts = document.getElementsByClassName( "subText" );
		for( var i = 0; i != texts.length; i++ ){
			texts[i].style.display = "";
		}
	},
	
	openMozillaPage: function(){
		document.location = "https://addons.mozilla.org/en-US/firefox/addon/fvd-speed-dial/";		
	},
	
	elemOffset: function( obj ){
		var curleft = curtop = 0;
		if (obj.offsetParent) {
			do {
				curleft += obj.offsetLeft;
				curtop += obj.offsetTop;
			}
			while(obj = obj.offsetParent);
		}
		
		
		
		return {
			"left": curleft,
			"top": curtop
		};
	},
	
	menuIsOpened: function(){
		var settings = frameWin.fvd_speed_dial_gFVDSSDSettings;
		var state = settings.getBoolVal( "sd.main_menu_displayed" );
		
		return state;
	},
	
	toggleMenu: function(){
		var state = !this.menuIsOpened();
		var settings = frameWin.fvd_speed_dial_gFVDSSDSettings;
		settings.setBoolVal( "sd.main_menu_displayed", state );
	},
	

	refreshMenu: function( attrs ){
		attrs = attrs || {};
		
		var settings = frameWin.fvd_speed_dial_gFVDSSDSettings;
		
		var menu = document.getElementById("searchBar").getElementsByClassName("activeContent")[0];
		
		if( attrs.noTransition ){
			menu.setAttribute( "style", "-moz-transition-duration: 0ms" );
		}
				
		menu.setAttribute("active", settings.getBoolVal( "sd.main_menu_displayed" ) ? "1" : "0");
		
		if( attrs.noTransition ){
			setTimeout( function(){
				menu.removeAttribute( "style" );				
			}, 1000 );
		}
		
	},
	
	showOptions: function( id, toElem, event, pos, ifNotHaveActive ){	
		pos = pos || "left";
	

		if( id == null ){
			switch( speedDial._displayMode() ){
				case "top_sites":
					id = "speedDialOptions";
				break;
				case "most_visited":
					id = "mostVisitedOptions";					
				break;
				case "recently_closed":
					id = "recentlyClosedOptions";					
				break;
			}
		}
		
		var left = null;
		var top = null;
		var adjustPos = true;
		
		if( toElem ){
			var offset = this.elemOffset( toElem );
			
			left = offset.left + 0;
			top = offset.top + toElem.offsetHeight;
		}
		else if(pos){
			left = pos.left;
			top = pos.top;
		}
		else{
			adjustPos = false;
		}
		
		
		var elems = document.getElementsByClassName("popupOptions");
		
		if( ifNotHaveActive ){
			for (var i = 0; i != elems.length; i++) {
				if( elems[i].getAttribute("active") == "1" ){
					return; // found active popup
				}
			}
		}
		
		for( var i = 0; i != elems.length; i++ ){
			if( elems[i].id == id  && elems[i].getAttribute("active") != "1"){ // check options already active, toggle effect
				(function(i){

					setTimeout( function(){
						
						if( pos == "right" ){					
							left += toElem.offsetWidth - elems[i].offsetWidth;
						}
						
						if( adjustPos ){
							elems[i].style.top = top + "px";
							elems[i].style.left = left + "px";	
						}
																	
					}, 0 );

				})(i);

				//elems[i].style.display = "block";
				elems[i].setAttribute("active", "1");
				elems[i].setAttribute("collapsed", "0");
				continue;
			}
			elems[i].setAttribute("active", "0");			
			//elems[i].style.display = "none";
		}
		
		if( event ){
			event.stopPropagation();			
		}
	},
	
	hideOptions: function(){
		var elems = document.getElementsByClassName("popupOptions");
		var foundActive = false;
		
		for( var i = 0; i != elems.length; i++ ){
			if( elems[i].getAttribute("active") == "1" ){
				elems[i].setAttribute("active", "0");	
				foundActive = true;							
			}
		}	
		
		if( foundActive ){
			// search not confirmed settings
			var confirms = document.getElementsByClassName("confirm");
			for( var i = 0; i != confirms.length; i++ ){
				if( confirms[i].getAttribute("appear") == "1" ){
					this.confirmSetting( confirms[i], confirms[i].getAttribute("for"), false );		
				}
			}
		}	
		

	},
	
	
	prefUpdated: function( pref ){	
		if( !this.partPrefs[pref] ){
			if( pref == "sd.display_type" ){
				this.settingsInvalidated = this.allRefreshesSettings;
			}
		}
		else{		
			if( ["sd.enable_top_sites", "sd.enable_most_visited", "sd.enable_recently_closed"].indexOf( pref ) != -1 ){
				var settings = frameWin.fvd_speed_dial_gFVDSSDSettings;
				var value = settings.getBoolVal( pref );
				
				if( !value ){
					// hide settings
					this.hideOptions();
				}
			}
			

		
			var partToUpdate = this.partPrefs[pref];
						
			if( this.settingsInvalidated.indexOf(partToUpdate) == -1 ){
				this.settingsInvalidated.push( partToUpdate );
			} 	
		}
		
		if( pref == "sd.disable_like_button" ){
			this.refreshLikeButton();
		}
		
		if( pref == "sd.enable_popular_group" ){
			this.rebuildGroupsList();
		}
		
		if( pref == "sd.main_menu_displayed" ){
			this.refreshMenu();
		}
	
	},
	
	release: function(){
		// remove observers
        this.observer.removeObserver(this.observerStruct, 'FVD.Toolbar-SD-Group-Updated');
        this.observer.removeObserver(this.observerStruct, 'FVD.Toolbar-SD-Group-Added');
        this.observer.removeObserver(this.observerStruct, 'FVD.Toolbar-SD-Group-Removed');
		this.settingsInvalidatedIntervalCheck.cancel();
	},
	
	observerStruct:{
	    observe: function(aSubject, aTopic, aData){
			switch (aTopic) {
				case 'FVD.Toolbar-SD-Group-Updated':
				case 'FVD.Toolbar-SD-Group-Removed':
				case 'FVD.Toolbar-SD-Group-Added':
					HtmlSearch.rebuildGroupsList();				
				break;	
			}
		}
	},
	
	setup: function(){		
		
		document.getElementById("migrateDoNotDisplayAgain").checked = false;
		
		this.refreshMenu( {noTransition: true} );
		
		window.addEventListener( "unload", function(){
			HtmlSearch.release();
		}, true );
		
		
		// invalidate settings check interval
			  
		this.settingsInvalidatedIntervalCheck = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);  	
		this.settingsInvalidatedIntervalCheck.init(function(){
			HtmlSearch.checkSettingsInvalidate();
		}, 200, Components.interfaces.nsITimer.TYPE_REPEATING_PRECISE);
		
		// setup observers
		this.observer = Components.classes['@mozilla.org/observer-service;1'].getService(Components.interfaces.nsIObserverService);
        this.observer.addObserver(this.observerStruct, 'FVD.Toolbar-SD-Group-Updated', false);
        this.observer.addObserver(this.observerStruct, 'FVD.Toolbar-SD-Group-Removed', false);
        this.observer.addObserver(this.observerStruct, 'FVD.Toolbar-SD-Group-Added', false);		
	
		try{
			Components.utils.import('chrome://fvd.speeddial/content/include/sd/m_migrate.js');
			var migrateBox = document.getElementById( "topSitesImportSettings" );
			if( fvd_speed_dial_FVDSDSingleMMigrate.foundAddons.length > 0 ){
				migrateBox.removeAttribute( "hidden" );				
			}
			else{
				migrateBox.setAttribute( "hidden",  true );
			}
			
		}
 		catch( ex ){

		}	

	
		// setup transitions
		var options = document.getElementsByClassName( "popupOptions" );
		for( var i = 0; i != options.length; i++ ){
			var option = options[i];
			option.setAttribute("collapsed", "1");
			option.addEventListener("transitionend", function( event ){
				if( event.target.getAttribute("active") == 0 ){
					event.target.setAttribute("collapsed", "1");	
				}				
			}, true);
			option.addEventListener("click", function( event ){
				event.stopPropagation();
			}, false);
		}
		

		// localize 
		var iterator = frameWin.fvd_speed_dial_FVDSSDToolbarProperties.getIterator( "fvd.search" );
		while(iterator.hasMoreElements()){
			var elem = iterator.getNext();
			elem.QueryInterface( Components.interfaces.nsIPropertyElement );
			
			var e = document.getElementsByClassName( "loc_"+elem.key );
			for( var i = 0; i != e.length; i++ ){
				var title = e[i].getAttribute("title");
				if( title == "%loc%" ){
					e[i].setAttribute("title", elem.value);					
				}
				else{
					e[i].textContent = elem.value;					
				}
			}
		}
		
		// setup settings
		this.refreshSettingsWindow();
		
		// set events to settings elements
		var settings = document.getElementsByClassName( "setting" );
		for( var i = 0; i != settings.length; i++ ){			
			var setting = settings[i];
			
			if( setting.getAttribute("confirm") ){
				(function(setting){
					setting.onchange = function(){
						var confirms = document.getElementsByClassName( "confirm" );
						for( var i = 0; i != confirms.length; i ++ ){
							if( confirms[i].getAttribute("for") == setting.id ){
								if( confirms[i].getAttribute("appear") != "1" ){
									confirms[i].setAttribute("appear", "1");	
								}
								else{
									confirms[i].setAttribute("appear", "0");
								}
								
								break;
							}
						}
					}
				})(setting);
				
				
				continue;
			}			
			
			var stype = setting.getAttribute( "stype" );
			var sname = setting.getAttribute( "sname" );
									
			if( setting.getAttribute("type") == "checkbox" ){
				(function(setting, stype, sname){
					setting.onchange = function(){
						HtmlSearch.ss( sname, setting.checked, stype );
					}	
				})(setting, stype, sname);							
			}
			else if(setting.getAttribute("type") == "radio"){
				(function(setting, stype, sname){
					setting.onchange = function(){
						HtmlSearch.ss( sname, setting.value, stype );
					}	
				})(setting, stype, sname);	
			}
			else if( setting.getAttribute("type") == "text" ){				
				(function(setting, stype, sname){
					if (stype == "int") {
						setting.onkeypress = function(event){
							var numbers = "0123456789";
							
							if (event.charCode == 0) {
								return true;
							}
							
							var letter = String.fromCharCode(event.charCode);
							
							return numbers.indexOf(letter) != -1;
						}						
					}					

					setting.onkeyup = function(){
						if (stype == "int" && setting.value.trim() == "") {
							return;
						}
						var v;
						var m
						try{
							v = parseInt(setting.value);
							m = parseInt(setting.getAttribute("max"));
						}
						catch(ex){
							return;
						}

						
						if( v > m ){
							setting.value = m;
						}
						
						HtmlSearch.ss( sname, setting.value, stype );						
					}
					
				})(setting, stype, sname);
			}	
			else if( setting.tagName == "SELECT" ){
				(function(setting, stype, sname){
					setting.onchange = function(){
						HtmlSearch.ss( sname, setting.value, stype );
					}	
				})(setting, stype, sname);	
			}	
		}
		

		
		// build partPrefs
		var parts = document.getElementsByClassName( "popupOptions" );
		for( var i = 0; i != parts.length; i++ ){
			var partName = parts[i].id.replace("Options", "");
			var settings = parts[i].getElementsByClassName( "setting" );
			for( var j = 0; j != settings.length; j++ ){
				this.partPrefs[settings[j].getAttribute("sname")] =  partName ;
			}
		}
		

		this.setupHotKeys();	
		this.refreshLikeButton();	
		
		var that = this;

		setTimeout( function(){
			
			that.displayCanTurnOfNewTabPopup();	
					
		}, 1000 );	
		
		document.querySelector( "#searchBar .buttonsRightPanel .buttonShowHide" ).addEventListener("click", function(){
			
			speedDial.toggleExpand();
			
		}, false);
	  
	  this.onSetup.forEach(function(f){
	    f();
	  });

	},
	
	setupHotKeysTitles: function(){
		
		var that = this;
		
		if( Math.random() <= 0.2 ){
			try{
				var properties = frameWin.fvd_speed_dial_FVDSSDToolbarProperties;
				
				var menuBottom = document.getElementsByClassName("menuBottom")[0].getElementsByClassName("button")[0];				
				menuBottom.setAttribute( "title", properties.getString( "fvd.search", "menu_hot_key" ) );
				
				var actualTypes = speedDial.actualModesList();
				var template = properties.getString( "fvd.search", "hot_key_number_tpl" );
								
				var typesElems = {
					"top_sites": "buttonSpeedDial",
					"most_visited": "buttonMostVisited",
					"recently_closed": "buttonRecentlyClosed"
				};

				for( var i = 0; i != actualTypes.length; i++ ){
					var elem = document.getElementById( typesElems[actualTypes[i]] );
					elem.setAttribute( "title", template.replace( "%number%", i + 1 ) );
				}
				
			}
			catch( ex ){
				
			}
		}
	},
	
	setupHotKeys: function(){
		var that = this;
		
		document.addEventListener( "keydown", function( event ){
			
			var tag = event.target.tagName.toLowerCase();
			if( ["textarea", "input"].indexOf( tag ) != -1 ){
				return;
			}
			
			try{
				// press space
				if( event.keyCode == 32 ){
					HtmlSearch.toggleMenu();		
					event.stopPropagation();
					event.preventDefault();
				}				
				else if( [49,50,51].indexOf( event.keyCode ) != -1 ){
															
					if( that.menuIsOpened() ){
						var index = Math.abs(49 - event.keyCode);
						var modes = speedDial.actualModesList();
						if( typeof modes[index] != "undefined" ){
							speedDial.setDisplayType( modes[index] );
						}						
					}
				}
				else if( event.keyCode == 13 ){
					
					speedDial.toggleExpand();
					
				}

			}
			catch( ex ){
	
			}
		}, false );		

	},
	
	ucfirst: function (str) {
		var firstLetter = str.slice(0,1);
		return firstLetter.toUpperCase() + str.substring(1);
	},
	
	refreshLikeButton: function(){
		
		var settings = frameWin.fvd_speed_dial_gFVDSSDSettings;
		var value = settings.getBoolVal( "sd.disable_like_button" );
		
		if( value ){
			document.getElementById("showHideButtonButtonBlock").setAttribute("hidden", true);
		}
		else{
			document.getElementById("showHideButtonButtonBlock").removeAttribute( "hidden" );
		}		
		
	},
	
	
	refreshSettingsWindow: function( toRefresh ){
		toRefresh = toRefresh || this.allRefreshesSettings;

		var settings = frameWin.fvd_speed_dial_gFVDSSDSettings;
		
		var enableSpeedDial = settings.getBoolVal( "sd.enable_top_sites" );
		var enableMostVisited = settings.getBoolVal( "sd.enable_most_visited" );
		var enableRecentlyClosed = settings.getBoolVal( "sd.enable_recently_closed" );
		
		if( toRefresh.indexOf("speedDial" != -1) ){			
			// build groups		
			this.rebuildGroupsList();
			
			var def = settings.getStringVal( "sd.display_type" ) == "top_sites";
			var allGroupsMax = settings.getIntVal( "sd.all_groups_limit_dials" );
			var thumbsType = settings.getStringVal( "sd.thumbs_type" );
			var defaultGroup = settings.getStringVal( "sd.default_group" );
			
			document.getElementById("enableSpeedDial").checked = enableSpeedDial;
			
			if(enableSpeedDial){
				if( !enableMostVisited && !enableRecentlyClosed ){
					document.getElementById("enableSpeedDial").setAttribute( "disabled", true );
				}
				else{
					document.getElementById("enableSpeedDial").removeAttribute( "disabled" );
				}
			}
			
			document.getElementById("defaultSpeedDial").checked = def;
			document.getElementById("maxGroupsSpeedDial").value = allGroupsMax;
			
			document.getElementById( "thumbsSpeedDial" + this.ucfirst(thumbsType) ).checked = true;
			document.getElementById( "defaultGroupSpeedDial" ).value = defaultGroup;
			
			this.rebuildColumnsField(["topSitesColumns"]);		
			
			var columns = document.getElementById( "topSitesColumns" );
			columns.value = settings.getStringVal( "sd.top_sites_columns" );
		}
		
		if( toRefresh.indexOf("mostVisited" != -1) ){
			
			var def = settings.getStringVal( "sd.display_type" ) == "most_visited";
			var showLast = settings.getIntVal( "sd.max_most_visited_records" );	
		
			var thumbsType = settings.getStringVal( "sd.thumbs_type_most_visited" );
			var cacheLifeTime = settings.getStringVal( "sd.most_visited_cache_life_time" );
			
			document.getElementById("enableMostVisited").checked = enableMostVisited;
			
			if(enableMostVisited){
				if( !enableSpeedDial && !enableRecentlyClosed ){
					document.getElementById("enableMostVisited").setAttribute( "disabled", true );
				}
				else{
					document.getElementById("enableMostVisited").removeAttribute( "disabled" );
				}
			}
			
			document.getElementById("defaultMostVisited").checked = def;
			document.getElementById("showLastMostVisited").value = showLast;
			
			document.getElementById( "thumbsMostVisited" + this.ucfirst(thumbsType) ).checked = true;
			
			document.getElementById( "mostVisitedOrder" + this.ucfirst(settings.getStringVal( "sd.most_visited_order" )) ).checked = true;
			
			document.getElementById( "cacheLifeTimeMostVisited" ).value = cacheLifeTime;

			this.rebuildColumnsField(["mostVisitedColumns"]);		
			
			var columns = document.getElementById( "mostVisitedColumns" );
			columns.value = settings.getStringVal( "sd.most_visited_columns" );
		}
		
		if( toRefresh.indexOf("recentlyClosed" != -1) ){
			
			var def = settings.getStringVal( "sd.display_type" ) == "recently_closed";
			var showLast = settings.getIntVal( "sd.max_recently_closed_records" );				
			
			document.getElementById("enableRecentlyClosed").checked = enableRecentlyClosed;
			
			if(enableRecentlyClosed){
				if( !enableSpeedDial && !enableMostVisited ){
					document.getElementById("enableRecentlyClosed").setAttribute( "disabled", true );
				}
				else{
					document.getElementById("enableRecentlyClosed").removeAttribute( "disabled" );
				}
			}
			
			this.rebuildColumnsField(["recentlyClosedColumns"]);		
			
			document.getElementById("defaultRecentlyClosed").checked = def;
			document.getElementById("showLastRecentlyClosed").value = showLast;
		}
	},
	
	/* set setting */
	ss: function( key, value, type ){	
	
		var settings = frameWin.fvd_speed_dial_gFVDSSDSettings;
		switch( type ){
			case "string":
				settings.setStringVal( key, value );
			break;
			case "int":
				try{
					value = parseInt(value);
				}
				catch(ex){
					return false;
				}
				settings.setIntVal( key, value );				
			break;
			case "bool":
				settings.setBoolVal( key, value ? true : false );				
			break;
		}
	},
	
	changeDefaultDisplayType: function( type, set ){
		if( !set ){
			type = "last_selected";
		}	
		this.ss( "sd.display_type", type, "string" );
	},
	
	rebuildGroupsList: function(){
		var settings = frameWin.fvd_speed_dial_gFVDSSDSettings;
		var list = document.getElementById( "defaultGroupSpeedDial" );
		list.options.length = 0;
		var groups = speedDial.storage.getGroupsList();		

		list.options[list.options.length] = new Option( document.getElementsByClassName("loc_last_selected_group_title")[0].textContent, "-1" );
		
		if( settings.getBoolVal("sd.enable_popular_group") ){
			list.options[list.options.length] = new Option( document.getElementsByClassName("loc_all_group_title")[0].textContent, "all" );			
		}
		
		for( var i = 0; i != groups.length; i++ ){
			var group = groups[i];
			list.options[list.options.length] = ( new Option( this.cropLength(group.name, 18), group.id ) );
		}
		
		list.value = settings.getStringVal( "sd.default_group" );
	},
	
	cropLength: function( str, len ){
		if( str.length <= len ){
			return str;
		}
		
		return str.substring(0, len) + "...";
	},
	
	setExpandedState: function( state ){
		var searchBar = document.getElementById("searchBar");	
		
		var needDDStart = false;
		
		if(state){					

			needDDStart = true;

		}
		else{	

		}
		
		if( needDDStart ){

		}

		searchBar.setAttribute("expanded", state ? "1" : "0");
	},
	
	processDblClick: function(event){
		if( event.target.id == "searchBar" || event.target.className == "dialIcons" ){
			speedDial.toggleSearchBarExpand();
		}
	},
	
	confirmSetting: function( confirm, settingId, action ){
		var setting = document.getElementById( settingId );
		
		if( action ){
			this.ss( setting.getAttribute("sname"), setting.checked, "bool" );
		}
		else{
			if( setting.getAttribute("type") == "checkbox" ){
				setting.checked = !setting.checked;
			}
		}

		confirm.setAttribute("appear", "0");
	},
	
	/* Event listeners */
	
	clickFrame: function(){
		this.hideOptions();	
		
		// hack for hot keys.
		setTimeout( function(){
			document.documentElement.focus();	
			document.documentElement.blur();			
		}, 0 );
		
		this._isFirstClickOnFrame = false;			


	},
	
	clickBody: function( event ){
		if( event.target.id == "searchBar" || event.target.className == "dialIcons" ){
			this.hideOptions();		
			//autocompleteHide();
		}
	},
	
	tabSelect: function( tab ){
		this.hideOptions();
	},
	
	setDisplayType: function( type, event ){
		speedDial.setDisplayType( type );
		this.hideOptions();
		event.stopPropagation();
	},
	
	flushMostVisitedCache: function(){
		speedDial.storage.invalidateMostVisitedCache();
		if( speedDial._displayMode() == "most_visited" ){
			speedDial.buildCells();
		}
	},
	
	frame: function(){
		return document.getElementById( "speedDialFrame" );
	},
	
	showDone: function( id ){
		var done = document.getElementById( id );
		if( done ){
			done.setAttribute( "active", "1" );
			setTimeout( function(){
				done.setAttribute( "active", "0" );
			}, 3000 );
		}
	},
	
	frameSpace: function(){
		var totalClientHeight = window.innerHeight;
		var topMenuHeight = document.getElementById("speedDialTop").offsetHeight;
		var bottomMenuHeight = 0; // bottom menu no have size, it appears after click //document.getElementById("bottomBlock").offsetHeight;
		
		
		return totalClientHeight - topMenuHeight - bottomMenuHeight;
	},
	
	scrollToDial: function( box ){
		
		var visibleStart = document.body.scrollTop;
		var visibleEnd = visibleStart + window.innerHeight;
		
		var boxY = box.y + document.getElementById("speedDialTop").offsetHeight;
		
		var needScroll = null
		
		if( boxY < visibleStart ){
			needScroll = boxY;
		}
		else if( boxY + box.height > visibleEnd ){
			needScroll = boxY + box.height - window.innerHeight;
		}
		
		if( needScroll ){			

			setTimeout(function(){
				document.documentElement.scrollTop = needScroll;
			}, 0);

		}
		
	},
	
	rebuildColumnsField: function( fields ){
		if( typeof fields == "undefined" || fields == null ){
			fields = [
				"topSitesColumns",
				"mostVisitedColumns",
				"recentlyClosedColumns"
			];
		}
		
		var scrollModes = {
			"topSitesColumns": function(){
				
				if( document.getElementById("thumbsSpeedDialCustom").checked ){					
					return speedDial.scrollingMode();					
				}
				else if( document.getElementById("thumbsSpeedDialList").checked ){
					return "vertical";
				}				
				
			},
			"mostVisitedColumns": function(){
				
				if( document.getElementById("thumbsMostVisitedCustom").checked ){					
					return speedDial.scrollingMode();					
				}
				else if( document.getElementById("thumbsMostVisitedList").checked ){
					return "vertical";
				}		
				
			},
			"recentlyClosedColumns": function(){
				return "vertical";
			}
		};
		
		var columnsAuto = null;
		
		for( var i = 0; i != fields.length; i++ ){
			var field = document.getElementById(fields[i]);
			var preValue = frameWin.fvd_speed_dial_gFVDSSDSettings.getStringVal( field.getAttribute( "sname" ) );
			
			var scrollMode = scrollModes[fields[i]]();
			var label = document.querySelector( "label[for="+fields[i]+"]" );
			var columnsAuto = null;
			if( scrollMode == "horizontal" ){
				columnsAuto = speedDial.optimalInCol;	
				label.textContent = _("number_of_rows");
			}
			else if( scrollMode == "vertical" ){
				columnsAuto = speedDial.optimalInRow;	
				label.textContent = _("number_of_columns");				
			}
			
			
			var numOfColumns = columnsAuto;
			if( preValue != "auto" ){
				if( preValue > columnsAuto ){
					numOfColumns = preValue;
				}
			}
			
			field.options.length = 1;
			
			for( var columnNum = 1; columnNum <= numOfColumns; columnNum++ ){
				var option = new Option( columnNum, columnNum );
				field.options[ field.options.length ] = option;
			}
			
			field.value = preValue;			
		}		
	},
	
	toggleBottomPanel: function(){
		var panel = document.getElementById("bottomBlock");
		var button = document.getElementById("showHideButtonButtonBlock");
		
		var active = panel.getAttribute( "active" );
		if( active == 0 ){
			active = 1;
			
			document.getElementById("fb_like").onload = function(){
				document.getElementById("fbLikeLoading").style.display = "none";
				document.getElementById("fb_like").setAttribute("loaded", "1");
			}
			
			document.getElementById("fb_like").src = "http://www.facebook.com/plugins/like.php?href=https://addons.mozilla.org/en-US/firefox/addon/fvd-speed-dial/&amp;layout=standard&amp;show_faces=true&amp;width=450&amp;action=like&amp;font=arial&amp;colorscheme=light&amp;height=80";
			
		}
		else{
			active = 0;
		}
		
		panel.setAttribute( "active", active );
		button.setAttribute( "active", active );
	},
	

	setMigrateMessageNotDisplayState: function( state ){
		this.ss( "sd.dont_display_migrate_message", state, "bool" );
	},
	
	setRateMessageNotDisplayState: function( state ){
		this.ss( "sd.dont_display_rate_message", state, "bool" );		
	}
	
};



