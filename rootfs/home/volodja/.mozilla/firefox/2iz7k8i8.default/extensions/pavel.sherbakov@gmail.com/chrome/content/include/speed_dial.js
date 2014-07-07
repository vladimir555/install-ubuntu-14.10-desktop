Components.utils.import("resource://fvd.speeddial.modules/config.js");

Components.utils.import("resource://fvd.speeddial.modules/screen_controller.js");
Components.utils.import("resource://fvd.speeddial.modules/misc.js");
Components.utils.import("resource://fvd.speeddial.modules/settings.js");
Components.utils.import("resource://fvd.speeddial.modules/storage.js");

Components.utils.import("resource://fvd.speeddial.modules/addonmanager.js");
Components.utils.import("resource://fvd.speeddial.modules/properties.js");
Components.utils.import("resource://fvd.speeddial.modules/themes.js");
Components.utils.import("resource://fvd.speeddial.modules/sync.js");

Components.utils.import("resource://fvd.speeddial.modules/poweroff.js");

Components.utils.import("resource://fvd.speeddial.modules/dialogs.js");

var fvd_speed_dial_gFVDSSD;
    
var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService); 
  
var fvd_speed_dial_speedDialSSD = { 
  GROUP_WIDTH: 150,
  GROUP_MARGIN: 10,
  GROUP_X_PADDING: 12,
  GROUP_LETTER_WIDTH: 7,
  
  BIG_CELL_SIZE: 260,
  MEDIUM_CELL_SIZE: 210,
  SMALL_CELL_SIZE: 150, 
  //CELLS_RATIO: 1.15,  
  CELLS_RATIO: 1.458,   
  BIG_MARGINS_SIZE: 5,
  MEDIUM_MARGINS_SIZE: 5,
  SMALL_MARGINS_SIZE: 5,
  CUSTOM_MARGINS_SIZE: 5,
  LIST_ELEM_WIDTH: 506,
  LIST_COLUMNS_MARGIN: 20,
  FAIL_IMG_HEIGHT: 130,
  SEARCHBAR_HEIGHT: 90,
  ADDITIONAL_FRAME_HEIGHT: 40,  
  MIN_DIALS_COUNT: 10, // if database contents dials < MIN_DIALS_COUNT fill page with empty dials 
  MAX_GROUPS_LIMIT: 50, // max 10 dials groups  
  FVD_SD_BG_FILE_NAME: "sd_bg.png", 
  HORIZONTAL_SCROLL_SPEED: 30,
  
  DND_DIALS_TYPE: "fvdsd/dialid",
  
  animDurationMs: 200,
  
  _addedDialId: null,

  id: null, // unique dial id in this browser session
  
  pixelsToSlideMode: 100, // slide pixels to change mode
  displayModesList: ["top_sites", "most_visited", "recently_closed"],
  
  parentDocument: null,
  
  passiveMode: false,
  homePageUrl: "chrome://fvd.speeddial/content/fvd_about_blank.html",
    registry: null,
    cellSize: {
        width: null,
        height: null
    },
  
  cellMargin: null,
  inRow: null,
  optimalInRow: null,
  optimalInCol: null, // for horizontal scroll mode
  
    
    container: null,
  listContainer: null,
    storage: null,
  
  currentGroupId: null, // currently selected group id
  
  popupedDial: null, // dial ID which popup opens for
  popupedListElem: null, // recently closed URI data which popuped
  popupedMostVisitedElem: null, // most visited URI data which popuped
  popupedGroupFromGroupBox: null, // popuped group from topLine group box

  preventsCacheData: {}, // prevents cache by ID
    displayMode: null,  
  top_sites_mode: null, // top sites thumbs mode
  recently_closed_mode: null, // recently closed thumbs mode
  most_visited_mode: null, // most visited thumbs mode
  // custom thumbs list
  /*
  customThumbs: {
    "gmail.com": "chrome://fvd.speeddial/skin/sd/custom_thumbs/gmail.png",
    "mail.google.com": "chrome://fvd.speeddial/skin/sd/custom_thumbs/gmail.png"
  },
  */ 
  
  listElemsRecentlyClosedBypassId: [],
  
  // enables settings
  enableTopSites: null,
  enableMostVisited: null,
  enableRecentlyClosed: null,
  
  // mostvisited interval
  mostVisitedInterval: null,
  // mostvisited group by
  mostVisitedGroupBy: null,
  
  // expand states
  topSitesExpanded: null,
  mostVisitedExpanded: null,
  recentlyClosedExpanded: null,
  
  //search bar expand state
  searchBarExpanded: null,
  
  // settings2 boxes
  settings2Boxes: [
    "top_sites_groups",
    "most_visited_settings",
    "list_types"
  ],
  
  showUrlInDial: null, // cache for setting Show URLs in dials
  showIconsAndTitles: null, // cache for show icons and titles setting
  
  listType: null, // cache for list type (title, uri)
  
  childWindows: [],
  
  mouseDown: null, // indicates mouse button down or up
  mouseDownPos: {
    x: null,
    y: null
  }, // pos where user down button
  
  failThumbSrc: "chrome://fvd.speeddial/skin/sd/skin/dials/fail_bg.png",
  
  refreshMostVisitedUrls: [], // list of urls that refreshes now
  
  backgroundAdjuster: null,
  
  displayPlusCells: null, 
  
  listenFor: [
    'FVD.Toolbar-SD-Deny-Updated',
    'FVD.Toolbar-SD-Group-Updated',
    'FVD.Toolbar-SD-Group-Removed',
    'FVD.Toolbar-SD-Group-Added',
    'FVD.Toolbar-SD-Dial-Added',
    'FVD.Toolbar-SD-Dial-Removed',
    'FVD.Toolbar-SD-Dial-Moved',
    'FVD.Toolbar-SD-Bg-Force-Refresh',
    'FVD.Toolbar-SD-MostVisited-Removed-Cleared',
    'FVD.Toolbar-SD-Dial-Screen-Updated',
    'FVD.Toolbar-SD-Dial-Force-Rebuild',
    'FVD.Toolbar-SD-Dial-Shedule-Rebuild',
    'FVD.Toolbar-SD-Dial-Sync-State-Updated',
    'FVD.Toolbar-SD-Dial-Sync-Turn',
    'FVD.Toolbar-SD-Dial-Sync-To-Sync-Data-Updated',
    'FVD.Toolbar-SD-Dial-Sync-Completed'
  ],
  
    // privates:
  
  _onClickAllGroups: function( event ){
    if( event.button != 2 ){
      fvd_speed_dial_speedDialSSD.setCurrentGroup( 'all' );
      fvd_speed_dial_speedDialSSD.buildCells();     
    }
    else{
      var defaultGroupPopupSetter = document.getElementById( "groupMenuPopupDefaultAll" );
      defaultGroupPopupSetter.setAttribute( "checked", fvd_speed_dial_speedDialSSD._defaultGroupId({settingsValue:true}) == "all" );
      
      var lastSelectedGroupSetter = document.getElementById( "groupMenuPopupDefaultLastSelectedAll" );
      lastSelectedGroupSetter.setAttribute( "checked", fvd_speed_dial_speedDialSSD._defaultGroupId({settingsValue:true}) == -1 );
            
      fvd_speed_dial_speedDialSSD.popupedGroupFromGroupBox = {
        "id": "all"
      };    
    }
  },
  
  _displayPlusCells: function(){
    if( this.displayPlusCells === null  ){
      this.displayPlusCells = fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.display_plus_cells");
    }
    return this.displayPlusCells;
  },
  
  _showIconsAndTitles: function(){
    if(this.showIconsAndTitles === null){
      this.showIconsAndTitles = fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.thumbs_icons_and_titles");      
    }
    
    return this.showIconsAndTitles;
  },
  
  _searchBarExpanded: function(){
    if( this.searchBarExpanded === null ){
      this.searchBarExpanded = fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.search_bar_expanded");
    }
    return this.searchBarExpanded;
  },
  
  _setCellSize: function( cell ){
    var cell = cell.getElementsByClassName("preview_parent")[0];
    
        cell.style.maxWidth = this.cellSize.width + "px";
        cell.style.maxHeight = this.cellSize.height + "px";
        cell.style.minWidth = this.cellSize.width + "px";
        cell.style.minHeight = this.cellSize.height + "px";   
  },
  
  
  _isDenyUrl: function( url, denyDetails ){    
    
    return this.storage.isDenyUrl( url, denyDetails );

  },
  
  _getMostVisitedTabs: function( count, timeMode, groupBy ){    
    timeMode = timeMode || "all_time";
    
    return this.storage.getMostVisited( timeMode, groupBy, count, fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.most_visited_order") );
  },
  
  _getShowUrlInDial: function(){
    if( this.showUrlInDial === null ){
      this.showUrlInDial = fvd_speed_dial_gFVDSSDSettings.getBoolVal( "sd.show_url_in_dial" );
    }
    return this.showUrlInDial;
  },
  
  _getListType: function(){
    if( this.listType === null ){
      this.listType = fvd_speed_dial_gFVDSSDSettings.getStringVal( "sd.list_type" );
    }
    return this.listType;
  },
  
  _defaultGroupId: function( params ){
    params = params || {};
    
    var group = fvd_speed_dial_gFVDSSDSettings.getStringVal( "sd.default_group" );
    
    if( params.settingsValue ){
      return group;
    }
    
    if( group == -1 ){
      return fvd_speed_dial_gFVDSSDSettings.getStringVal( "sd.last_opened_group" ); 
    }
    
    return group;
  },
  
  _setDefaultGroupId: function( id ){
    fvd_speed_dial_gFVDSSDSettings.setStringVal("sd.default_group", id);
  },
  
  setPopupedGroupSync: function( sync ){
    
    if( !sync ){
      sync = this.popupedGroupFromGroupBox.sync == 1 ? 0 : 1;
    }

    if( sync == 0 ){
      
      if( fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.display_set_group_as_nosync") ){
        
        var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
        
        var checkState = {
          value: false
        };
                  
        var result = promptService.confirmCheck( window, 
                   fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "dialog.sync.set_group_as_no_sync.title"),
                   fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "dialog.sync.set_group_as_no_sync.text"),
                   fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "sd.alert.dont_show_again"), checkState );
        
        if( checkState.value ){
          
          fvd_speed_dial_gFVDSSDSettings.setBoolVal("sd.display_set_group_as_nosync", false);
          
        }
        
        if( !result ){
          return;
        }
                   
      }
      
    }

    fvd_speed_dial_Storage.updateGroupData( this.popupedGroupFromGroupBox.id, {
      sync: sync
    } );
    
  },
  
  _getGroupId: function(){    
    if( !this.currentGroupId ){
      this.currentGroupId = this._defaultGroupId();
      
      if( this.currentGroupId != "all" || !fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.enable_popular_group") ){
        //check default group exists              
        var another = this.storage.returnAnotherGroupIfNotExists( this.currentGroupId );
        if( another ){
          this.currentGroupId = another;
        } 
      }
    }
    
    return this.currentGroupId;
  },
  

  _getRecentClosedTabs: function( count ){
    
    var sStore = Components.classes['@mozilla.org/browser/sessionstore;1'].getService(Components.interfaces.nsISessionStore);
    var closedTabs = [];
    try{
      var mainWindow = this._getMainWindow();
      closedTabs = JSON.parse( sStore.getClosedTabData(mainWindow) );     
    }
    catch(ex){
      //dump( "EXC in get closed tabs. ("+ex+"), chrome window = "+mainWindow+"\r\n" );
    }

    
    //console.log( closedTabs );
    
    var data = [];    
    var addedUrls = [];   

    for( var i = 0; i != closedTabs.length; i++ ){
      var entry = closedTabs[i].state.entries[ closedTabs[i].state.entries.length - 1 ];
      
        
      
      var url = "";
      var title = "";
      var favicon = "";
      var id = i;
      
      if( entry.url ){
        url = entry.url;
      }
      else if( entry.children[0] && entry.children[0].url ){
        url = entry.children[0].url;
      }
      
      if( addedUrls.indexOf( url ) != -1 ){
        continue;
      }
      
      // exclude chrome:// urls
      if( url.toLowerCase().indexOf( "chrome://" ) != -1 ){
        continue;
      }
      
      if( entry.title ){      
        title = entry.title;
      }
      else if( entry.children && entry.children[0].title ){
        title = entry.children[0].title;
      }
      
      /*
      if( entry.ID ){
        id = entry.ID;
      }
      */
      
      if( !title ){
        title = url;
//        continue;
      }
      
      if( this.listElemsRecentlyClosedBypassId.indexOf(id) != -1 ){
        continue;
      }
      
      // filter by deny urls
      if( this._isDenyUrl( url ) ){
        continue;
      }
      
      data.push({
        "title": title,
        "url": url,
        //"favicon": this._faviconUrl(url),
        "id": id
      });
      
      addedUrls.push( url );
    }
    if( count ){
      data = data.slice( 0, count );      
    }

    
    return data;
  },
    
  _clearThumbnailsModeCache: function(){
    this.top_sites_mode = null;
    this.most_visited_mode = null;
    this.recently_closed_mode = null;
  },
    
  _thumnailsMode: function(){
    var mode = "small";
    
    if( !this.top_sites_mode ){
      try{
        this.top_sites_mode = fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.thumbs_type");
      }
      catch(ex){
        
      } 
    }
    
    if( !this.most_visited_mode ){
      try{
        this.most_visited_mode = fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.thumbs_type_most_visited");
      }
      catch(ex){
        
      } 
    }
    
    if( !this.recently_closed_mode ){
      try{
        this.recently_closed_mode = fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.thumbs_type_recently_closed");
      }
      catch(ex){
        
      } 
    }
    
    
    
    if( this._displayMode() == "top_sites" ){
      mode = this.top_sites_mode;
    }
    else if( this._displayMode() == "recently_closed" ){
      mode = this.recently_closed_mode;
    } 
    else if( this._displayMode() == "most_visited" ){
      mode = this.most_visited_mode;
    }   
  

    return mode;
  },
  
  _displayMode: function(){
    var mode = "top_sites";
    
    var firstRun = false;
    
    if( this.displayMode ){
      mode = this.displayMode;
    }
    else{
      firstRun = true;
      try{
        mode = fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.display_type");
      }
      catch(ex){
        
      }
    } 
    
    if( mode == "last_selected" ){
      try{
        mode = fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.display_type_last_selected");
      }
      catch( ex ){
        mode = "top_sites";
      }
    } 
    
    // need to check if displayType is disabled and adaptate new display type
    
    if( firstRun ){     
      var displayTypeIsDisabled = false;
      if( !this.enableTopSites && mode == "top_sites" ){
        displayTypeIsDisabled = true;
      }
      if( !this.enableRecentlyClosed && mode == "recently_closed" ){
        displayTypeIsDisabled = true;
      }   
      if( !this.enableMostVisited && mode == "most_visited" ){
        displayTypeIsDisabled = true;
      }   
      
      if( displayTypeIsDisabled ){
        // first not disabled type
        if( this.enableTopSites ){
          mode = "top_sites";
        }
        else if( this.enableRecentlyClosed ){
          mode = "recently_closed";
        }   
        else if( this.enableMostVisited ){
          mode = "most_visited";
        }
      } 
    }
    
    
    this.displayMode = mode;
    
    return mode;
  },
  
  // return thumbs or list, is depends on displayMode and displayMode type if select top_sites
  _displayModeType: function(){
    var result = "";
    if( this._displayMode() == "top_sites" || this._displayMode() == "most_visited" ){
      if( this._thumnailsMode() == "list" ){
        result = "list";  
      }
      else{       
        result = "thumbs";
      }
    }
    else if(this._displayMode() == "recently_closed"){
      result = "list";
    }
    
    return  result;
  },
  
  
    /**
     * return XULElement - plus cell node
     */
    _buildPlusCell: function( emptyPlus ){
    var snippet = document.getElementById("widget_cell").cloneNode(true);
    this._setCellSize( snippet );
    snippet.setAttribute( "thumb_size", this._thumnailsMode() );
    snippet.style.margin = this.cellMargin + "px";
    
    snippet.setAttribute( "pluscell", "1" );
    snippet.setAttribute( "display_title_2", this._getShowUrlInDial() );
    snippet.setAttribute( "topTitle", this._showIconsAndTitles() ? "1" : "0" );

    var b = snippet.getElementsByClassName( "sd_cell_title2" );
    
    snippet.removeAttribute( "ondrop" );
    snippet.removeAttribute( "ondragleave" );
    snippet.removeAttribute( "ondragover" );
    snippet.removeAttribute( "ondragstart" );
    snippet.removeAttribute("id");
    snippet.removeAttribute("context");   
    
    var preview = snippet.getElementsByClassName( "sd_cell_preview_container" )[0];
    /*        
    preview.style.background = "url(chrome://fvd.speeddial/skin/sd/skin/dials/plus.png)";
    preview.style.backgroundPosition = "center center";
    preview.style.backgroundRepeat = "no-repeat";
    */
    /*
        var vbox = document.createElement("vbox");
        vbox.setAttribute("class", "sd_cell");
        vbox.setAttribute("align", "center");
    vbox.style.margin = this.cellMargin + "px";
        
    this._setCellSize( vbox );
    
        var hbox = document.createElement("hbox")
        hbox.setAttribute("align", "center");
        hbox.setAttribute("flex", 1);
        vbox.appendChild(hbox);
    if( !emptyPlus ){
          var image = document.createElement("image");
          image.setAttribute("src", "chrome://fvd.speeddial/skin/sd/plus.png");
          image.setAttribute("flex", 2);    
          image.style.width = "50px";
          image.style.height = "50px";
          vbox.firstChild.appendChild(image);
    }

        */
        snippet.onclick = function( event ){
      if( event.button == 0 ){
              fvd_speed_dial_speedDialSSD.createNewDial();        
      }
        }
            
    snippet.addEventListener( "drop", function( event ){
      
      var groupId = fvd_speed_dial_speedDialSSD.currentGroupId;
      
      if( groupId == "all" ){
        groupId = fvd_speed_dial_speedDialSSD._defaultGroupId();
      }
                
      var url = event.dataTransfer.getData( "text/plain" );
            
      if( url.match(/^https?:\/\//) ){
                      
        fvd_speed_dial_speedDialSSD.addDialToStorage( {
          url: url,
          group: groupId,
          title: "",
          thumb_source_type: "url",
          thumb_url: "",
          hand_changed: false,
          update_interval: "",
          use_js: 1,
          disable_plugins: fvd_speed_dial_Storage.DISABLE_PLUGINS_DEFAULT,
          delay: fvd_speed_dial_Storage.DELAY_DEFAULT
        } );
            
        event.stopPropagation();
        event.preventDefault();
        
      }
      
    }, false );
    
    
        return snippet;
    },
  
  _previewDir: function(){
    return this.storage.dialsPreviewDir();
  },
  
  _previewFileById: function( dialId ){
    return this.storage.dialPreviewFileById( dialId );
  },
  
  _previewUrlById: function( dialId, status ){
    if( status == "thumb_failed" ){
      return this.failThumbSrc;
    }   
    
    var url = this.storage.dialPreviewUrlById( dialId );
    
    //dump( "storage.dialPreviewUrlById("+dialId+") = " + url + "\n");
    
    if( url == false ){
      return false;
    }
    
    if( typeof this.preventsCacheData[dialId] != "undefined" ){
      url += "?_c="+this.preventsCacheData[dialId];
    }
    
    return url;
  },
  
  _faviconUrl: function( pageUrl, callback, tryNum ){
    
    if( !tryNum ){
      tryNum = 1;
    }
    
    var self = this;
            
    try{
      var asyncFavicons = Components.classes["@mozilla.org/browser/favicon-service;1"]
                          .getService(Components.interfaces.mozIAsyncFavicons);
      
      var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
      var uri = ioService.newURI(pageUrl, null, null);
      
      return callback( "https://plus.google.com/_/favicon?domain=" + uri.host );
                
      asyncFavicons.getFaviconURLForPage(uri,
            {
        onComplete: function( aURI, aDataLen, aData, aMimeType ){
            
          if( aURI ){
            dump( "OK: " + aURI.spec + "\n") ;
            
            return callback( aURI.spec );
          }
          
          if( tryNum == 6 ){
            dump("Fail get for: "+ pageUrl + "\n");
        
            return callback( "moz-anno:favicon:" + pageUrl + ";" );
          }
            
          if( tryNum == 2 || tryNum == 4 ){
            // try get favicon from domain with www.  
            if( uri.host.toLowerCase().indexOf("www.") !== 0 ){
              uri.host = "www." + uri.host;
            }
            else{
              uri.host = uri.host.substring( 4 );
            }             
          }
          else if( tryNum == 3 || tryNum == 5 ){
            // try get favicon from domain from another scheme
            if( uri.scheme == "http" ){
              uri.scheme = "https";
            }
            else if( uri.scheme == "https" ){
              uri.scheme = "http";
            }
          }
                  
      
                    
          self._faviconUrl( uri.spec, callback, tryNum + 1 );   
                            
        }
      });
    }
    catch( ex ){

      dump("FAILED "+ex+"\n");

      callback( self._faviconUrlOld( pageUrl ) );
      
    }
    
  },
  
  _faviconUrlOld: function( pageUrl ){    
    
    try{
      var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
          var uri = ioService.newURI(pageUrl, null, null);
            var fav = Components.classes['@mozilla.org/browser/favicon-service;1'].getService(Components.interfaces.nsIFaviconService);
          try {
              var url = fav.getFaviconImageForPage(uri).spec;
                
        if( url == fav.defaultFavicon.spec ){
          throw "";
        }
          
        if( !url ){         
          url = fav.defaultFavicon.spec;
        }
        else{
      
        }
        
        return url;
          } 
      catch(ex){    
      
        // try get favicon from domain with www.
        if( uri.host.toLowerCase().indexOf("www.") == -1 ){
          uri.host = "www." + uri.host;
          
          try{
            var url = fav.getFaviconImageForPage(uri).spec; 
            return url;
          }
          catch( ex ){
            
          }
          
        }

        
        
        return fav.defaultFavicon.spec;
      }
    }
    catch(ex){

    }
    
      return false;

  },
  
  _getMainWindow: function(){
    var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                           .getInterface(Components.interfaces.nsIWebNavigation)
                           .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                           .rootTreeItem
                           .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                           .getInterface(Components.interfaces.nsIDOMWindow);
    
        return mainWindow;
  },
  
  _navigate: function( url, event, openType, fullOpenType ){  
    
    this.blurUrlBar();
    
        var browser = this._getMainWindow().getBrowser();
    
    var in_new_tab = false;
    var background = false;
    
    var type = fullOpenType || fvd_speed_dial_gFVDSSDSettings.getStringVal( "sd.open_links_type" );
    if( type == "new_tab" ){
      in_new_tab = true;
    }
    if( type == "new_tab_passive" ){
      in_new_tab = true;
      background = true;
    }
    
    if( event ){
      if( event.button == 1 ){
        in_new_tab = true;
        background = true;
      }
    }
    
        if (browser) {
            try {
        if( openType == "blank" ){
          in_new_tab = true;
        }
        
        var shift;
        var ctrl;
        
        if( event ){
                    shift = event.shiftKey;
                    ctrl = event.ctrlKey;
        }         
        
        function _prepTreeStyleTab(){
          
          if (browser.treeStyleTab && browser.treeStyleTab.readyToOpenChildTab) 
            browser.treeStyleTab.readyToOpenChildTab();           
          
        }
        
        if( shift || ctrl ){
                    if (ctrl) {
            
            _prepTreeStyleTab();
            
                        var tab = browser.addTab(url);
            if( !shift ){
                          browser.selectedTab = tab;              
            }
            
                    }
                    else if (shift) {
                      window.openDialog('chrome://browser/content/browser.xul', '_blank', 'chrome,all,dialog=no', url);                            
                    }   
        }
        else{
                if (in_new_tab) {
            
            _prepTreeStyleTab();
            
                    var tab = browser.addTab(url);
            if( !background ){  
                        browser.selectedTab = tab;            
            }
                }
          else{
            browser.loadURI(url);           
          }
        }       

            } 
            catch (e) {
        //dump( "error go " + e + "\r\n" );
            }
        }
 


  },
  
  _getDialCell: function( dialId ){
    var cell = document.getElementById( "cell_" + dialId );
    return cell;
  },
  
  _assignCellEvents: function( snippet, data ){
    
    var that = this;
    
    var removeCross = snippet.getElementsByClassName("cross")[0];
    
    if( removeCross ){
      (function( dialId ){
        removeCross.onclick = function(event){  
          if( event.button != 0 ){
            return false;
          }
          
          that.removeDialWithConfirm( dialId );

          
          event.stopPropagation();
        }
      })(data.id);      
    }
    
    var editButton = snippet.getElementsByClassName("edit")[0];
    if( editButton ){
      (function( dialId ){
        
        editButton.addEventListener( "click", function( event ){
          
          if( event.button == 0 ){
            fvd_speed_dial_speedDialSSD.editDial( dialId ); 
            event.stopPropagation();  
          }
          
        }, false );
    
      })( data.id );
    }
    

    var allowAddClick = true;

    snippet.onclick = function(event){  
      if( event.button == 0 || event.button == 1 ){
        
        if( allowAddClick ){
          allowAddClick = false;
          fvd_speed_dial_speedDialSSD.clickDial( data.id );         
          setTimeout( function(){
            allowAddClick = true;
          }, 10000 );
        }
        
        fvd_speed_dial_speedDialSSD._navigate( data.url, event );
        event.stopPropagation();
      }
      else if( event.button == 2 ){
        fvd_speed_dial_speedDialSSD.popupedDial = data.id;
        // disable menuItems which dial in group        
        var groupsListMenu = document.getElementById( "topSitesMoveToGroups" ); 
        for( var i = 0; i != groupsListMenu.childNodes.length; i++ ){
          if( groupsListMenu.childNodes[i].getAttribute("groupId") == data.group_id ){
            groupsListMenu.childNodes[i].setAttribute( "disabled", true );
          }
          else{
            groupsListMenu.childNodes[i].setAttribute( "disabled", false );
          }
        }         
      }
    }
    
    snippet.ondblclick = function( event ){
      event.stopPropagation();
    }
    
    // onmousedown is assigned for mouse hot-key
    // beacuse sliding hot key and repositioning of dial cause wrong situation
    snippet.onmousedown = function( event ){
      event.stopPropagation();
    }
    
    if( this._displayModeType() == "list" ){
      // assign dial list specified events
      var editIcon = snippet.getElementsByClassName("list_edit")[0];
      var refreshIcon = snippet.getElementsByClassName("list_refresh")[0];
      var removeIcon = snippet.getElementsByClassName("list_cross")[0];
      
      editIcon.onclick = function( event ){
        if( event.button == 0 ){
          fvd_speed_dial_speedDialSSD.editDial( data.id );
          event.stopPropagation();
        }
      }
      
      refreshIcon.onclick = function( event ){
        if( event.button == 0 ){
          fvd_speed_dial_speedDialSSD.updateDialData( data.id );
          event.stopPropagation();
        }
      }
      
      removeIcon.onclick = function( event ){
        if( event.button == 0 ){
          fvd_speed_dial_speedDialSSD.removeDialWithConfirm( data.id );
          event.stopPropagation();
        }
      }
      
      snippet.addEventListener( "dragover", function( event ){  
            
        if( snippet.getAttribute( "drag_over" ) == 1 ){
          if ("cell_" + event.dataTransfer.getData( fvd_speed_dial_speedDialSSD.DND_DIALS_TYPE ) != snippet.getAttribute("id")) {
            var box = snippet.boxObject;
                                    
            var x = event.clientX - box.x;
            var y = event.clientY - box.y;
            
            if( y < box.height / 2 ){
              snippet.setAttribute( "to_insert_before", 1 );
              snippet.removeAttribute( "to_insert_after" );           
            }   
            else{
              snippet.setAttribute( "to_insert_after", 1 );
              snippet.removeAttribute( "to_insert_before" );                        
            } 
          }
        }
      }, false );
      
    }
    else{
      snippet.addEventListener( "dragover", function( event ){  
            
        if( snippet.getAttribute( "drag_over" ) == 1 ){
          var box = snippet.boxObject;
                                  
          var x = event.clientX - box.x;
          var y = event.clientY - box.y;
                    
          var moveType = "none";
          
          if( "cell_"+event.dataTransfer.getData( fvd_speed_dial_speedDialSSD.DND_DIALS_TYPE ) != snippet.getAttribute("id") ){
            
            if( x < box.width / 4 ){
              moveType = "to_insert_before";            
            }   
            else if( x > box.width * 3 / 4 ){
              moveType = "to_insert_after"; 
            }     
            else{
              moveType = "to_replace";  
            }
            
          }
          
          that.setMoveArrows(moveType, event);
        }
      }, false );
    }
    
    if (data.thumb_src) {
      if (data.status == "thumb_failed") {
        
        if (this._previewUrlById(data.id)) {
          
          if (data.ignore_restore_previous_thumb != 1) {
            var that = this;
            
            try{
              var restoreMessage = snippet.getElementsByClassName( "restoreThumb" )[0]; 
              var yes = restoreMessage.getElementsByClassName( "yes" )[0];      
              var no = restoreMessage.getElementsByClassName( "no" )[0];      
              
              yes.addEventListener( "click", function( event ){
                that.storage.updateDialData( data.id, {
                  status: "",
                  restore_previous_thumb: "1"                 
                } );
                that.rebuildCellById( data.id );
                event.stopPropagation();
              }, false );     
              
              no.addEventListener( "click", function( event ){
                that.storage.updateDialData( data.id, {
                  ignore_restore_previous_thumb: "1"
                } );
                that.rebuildCellById( data.id );
                event.stopPropagation();
              }, false );   
            } 
            catch( ex ){
              
            } 
          }
          
        }
        
      }
    }
    
  },
  
  /*
   * type = (dial, list_elem), type of elements of generated list. dial - top sites list elem, list_elem - recently_closed list elem
   */
  
  _assignListElemEvents: function( snippet, data, type ){   
    
    if( type == "list_elem" ){
      var removeIcon = snippet.getElementsByClassName("list_cross")[0];
      var addIcon = snippet.getElementsByClassName("list_add")[0];
      var denyIcon = snippet.getElementsByClassName("list_deny")[0];
      
      removeIcon.onclick = function(event){
        if (event.button != 2) {
          fvd_speed_dial_speedDialSSD.removeListElemById( data.id );
          event.stopPropagation();
        }
      }
      
      addIcon.onclick = function(event){
        if (event.button != 2) {
          fvd_speed_dial_speedDialSSD.createNewDial( data.url, data.title );
          event.stopPropagation();
        }
      }
      
      denyIcon.onclick = function(event){
        if (event.button != 2) {
          fvd_speed_dial_speedDialSSD.denyUrl( data.url );
          event.stopPropagation();
        }
      }
      
      var that = this;
      
      snippet.onclick = function(event){        
        if( event.button == 2 ){
          fvd_speed_dial_speedDialSSD.popupedListElem = data; 
          event.stopPropagation();      
        }
        else{
          if( that._displayMode() == "recently_closed" ){
            // forget tab
            var sStore = Components.classes['@mozilla.org/browser/sessionstore;1'].getService(Components.interfaces.nsISessionStore);
            sStore.forgetClosedTab( that._getMainWindow(), data.id );
          }
          
          fvd_speed_dial_speedDialSSD._navigate(data.url, event);
        }               
      }
      
      snippet.ondblclick = function( event ){
        event.stopPropagation();
      }
    }
    else if( type == "dial" ){
      // assign dial-cell specified events
      this._assignCellEvents( snippet, data );  
    }
    

    

  },
  
  _refreshExpandsStates: function(){  
    this.topSitesExpanded = fvd_speed_dial_gFVDSSDSettings.getBoolVal( "sd.top_sites_expanded" );
    this.mostVisitedExpanded = fvd_speed_dial_gFVDSSDSettings.getBoolVal( "sd.most_visited_expanded" );
    this.recentlyClosedExpanded = fvd_speed_dial_gFVDSSDSettings.getBoolVal( "sd.recently_closed_expanded" );
  },
  
  _refreshEnables: function(){
    this.enableTopSites = fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.enable_top_sites");
    this.enableMostVisited = fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.enable_most_visited");
    this.enableRecentlyClosed = fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.enable_recently_closed");
  },
  
  _assignMostVisitedCellEvents: function( data, snippet ){
    var removeIcon = snippet.getElementsByClassName("cross")[0];
    var addIcon = snippet.getElementsByClassName("add")[0];
    var denyIcon = snippet.getElementsByClassName("deny")[0];
    var editIcon = snippet.getElementsByClassName("edit")[0];
    
    var inGroupTitle = snippet.getElementsByClassName("in_group")[0];
    
    // for list-mode prepares
    if( !removeIcon ){
      removeIcon = snippet.getElementsByClassName("list_cross")[0];
    }
    if( !addIcon ){
      addIcon = snippet.getElementsByClassName("list_add")[0];
    }   
    if( !denyIcon ){
      denyIcon = snippet.getElementsByClassName("list_deny")[0];
    }
    
    if( editIcon ){
      editIcon.onclick = function( event ){
        if (event.button != 2) {
          fvd_speed_dial_speedDialSSD.editMostVisitedDialByData( data );
          event.stopPropagation();
        }
      };
    }
    
    removeIcon.onclick = function(event){
      if (event.button != 2) {
        fvd_speed_dial_speedDialSSD.removeMostVisited( data.url );
        event.stopPropagation();
      }
    }
    
    addIcon.onclick = function(event){
      if (event.button != 2) {
        fvd_speed_dial_speedDialSSD.createNewDial( data.url, data.title );
        event.stopPropagation();
      }
    }
    
    denyIcon.onclick = function(event){
      if (event.button != 2) {
        fvd_speed_dial_speedDialSSD.denyUrl( data.url );
        event.stopPropagation();
      }
    }
    
    snippet.onclick = function(event){
      if( event.button == 2 ){
        fvd_speed_dial_speedDialSSD.popupedMostVisitedElem = data;
        event.stopPropagation();
      }
      else{
        fvd_speed_dial_speedDialSSD._navigate(data.url, event);
      }       
    } 
    
    snippet.ondblclick = function( event ){
      event.stopPropagation();
    }
    
    if(inGroupTitle){
      inGroupTitle.onclick = function(event){
        if( event.button != 2 ){
          fvd_speed_dial_speedDialSSD._viewMostVisitedGroup( fvd_speed_dial_speedDialSSD._mostVisitedInterval(), data.domain );
          event.stopPropagation();
        }     
      } 
    }
  },
  
  _fillListElemContent: function( snippet, data, type ){
    var label = snippet.getElementsByClassName("sd_list_elem_title")[0];
    var favicon = snippet.getElementsByClassName("sd_list_elem_favicon")[0];
    
    if( this._getListType() == "uri" ){
      label.setAttribute( "value", data.url );      
    }
    else if( this._getListType() == "title" ){
      label.setAttribute( "value", data.title );        
    }   
    
    this._faviconUrl( data.url, function( faviconUrl ){
      favicon.style.background = "url("+faviconUrl+")";
      favicon.style.backgroundSize = "14px 14px";
      favicon.style.backgroundRepeat = "no-repeat";
    } );
    
    //setAttribute( "src", data.favicon );  
    
    snippet.setAttribute( "tooltiptext", data.url );    
    label.setAttribute( "tooltiptext", data.url );    
    favicon.setAttribute( "tooltiptext", data.url );  
    
    if( type == "list_elem" ){
      snippet.setAttribute( "id", "list_elem_"+data.id );
      snippet.setAttribute("context", "cell_menu_type3");
    }
    else if( type == "most_visited" ){
      var viewsLabel = snippet.getElementsByClassName("views_count")[0];
      var inGroupLabel = snippet.getElementsByClassName("in_group")[0];
            
      var viewsTemplate = fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.most_visited_cell.views" );
      var inGroupTemplate = fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.most_visited_cell.in_group" );         
        
      if( viewsLabel ){
        viewsLabel.setAttribute( "value", viewsTemplate.replace("{COUNT}", data.total_visits) );  
      }
      if(inGroupLabel){
        inGroupLabel.setAttribute( "value", inGroupTemplate.replace("{COUNT}", data.in_group) );  
      }
      
      snippet.setAttribute("context", "cell_menu_type2");
    }
    if( type ){
      snippet.setAttribute( "class", snippet.getAttribute("class") + " " + type );      
    }
  },
  
  _fillListElem: function( snippet, data, type ){
    type = type || "list_elem"; 
    
    this._fillListElemContent( snippet, data, type  );
    this._assignListElemEvents( snippet, data, type );  
  },
  
  _buildListElem: function( data ){
    var snippet = document.getElementById( "widget_list_elem" ).cloneNode(true);
    
    this._fillListElem( snippet, data );
    
    return snippet;     
  },
  
  _customThumb: function( url ){
    url = url.toLowerCase();
    for( var domain in this.customThumbs ){
      if( url.indexOf( domain ) != -1 ){
        return this.customThumbs[domain];
      }
    }
    
    return null;
  },
  
  
  _md5: function( str ){
    
    return fvd_speed_dial_Misc.md5( str );    
    
  },
  
  _grabMostVisitedThumb: function( uri ){     
    var hash = this._md5( uri );    
    
    var cell = document.getElementById( "mv_" + hash );
    if( cell ){
      cell.setAttribute( "loading", 1 );
    }
    
    fvd_speed_dial_ScreenController.refreshMostVisitedPreview( uri );
  },
  
  _mostVisitedGrabData: function(url){
    var data = this.storage.getMostVisitedData( url );
    return data;
  },
  
  _refereshMostVisitedThumbSnippet: function( snippet, url, grabData ){
    this._grabMostVisitedThumb( url, grabData );
    snippet.setAttribute( "loading", "1" );     
  },
  
  _refereshMostVisitedThumb: function( url ){
    var grabData = this._mostVisitedGrabData( url );
    
    this.clearImageCacheMostVisited( url );
    
    var snippet = document.getElementById( "mv_" + this._md5(url) );
    if( snippet ){
      this._refereshMostVisitedThumbSnippet( snippet, url, grabData );
    }
  },
  
  // remove www., http:// and end / from url
  _removeUrlDetails: function( url ){
    return this.storage._prepareDenySign( url, "url" );
  },
  
  _buildMostVisitedCell: function( data ){

    var snippet = null;
    
    var needGrabScreenshot = false;
    

    var hash = this._md5( data.url ); 
    
    var grabData = this._mostVisitedGrabData( data.url );
  
    if( grabData.title ){   
      data.title = grabData.title;
    }   
    if( grabData.thumb_source_type ){
      data.thumb_source_type = grabData.thumb_source_type;
    }
    if( grabData.thumb_url ){
      data.thumb_url = grabData.thumb_url;
    }   
    
                  
    if (this._displayModeType() == "thumbs") {
      snippet = document.getElementById( "widget_cell_most_visited" ).cloneNode(true);
      
      this._setCellSize( snippet );     
              
      snippet.setAttribute( "thumb_size", this._thumnailsMode() );
      snippet.setAttribute( "display_title_2", this._getShowUrlInDial() );
      snippet.setAttribute( "topTitle", this._showIconsAndTitles() ? "1" : "0" );
      
      var favicon = snippet.getElementsByClassName("sd_cell_favicon")[0];
      favicon.setAttribute( "src", data.favicon );
      var title = snippet.getElementsByClassName("sd_cell_title")[0];
      var title2 = snippet.getElementsByClassName("sd_cell_title2")[0];
      
      title.setAttribute( "value", data.title );
      
      title2.setAttribute( "value", this._removeUrlDetails( data.url ) );
      title.setAttribute( "tooltiptext", data.title );
      
      // views and in group
      var viewsLabel = snippet.getElementsByClassName("views_count")[0];
      var inGroupLabel = snippet.getElementsByClassName("in_group")[0];
      
      var viewsTemplate;
      var inGroupTemplate;
      
      if( this._thumnailsMode() == "small" ){
        viewsTemplate = fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.most_visited_cell.views_small" );
        inGroupTemplate = fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.most_visited_cell.in_group_small" );   
      }
      else{
        viewsTemplate = fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.most_visited_cell.views" );
        inGroupTemplate = fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.most_visited_cell.in_group" );       
      }
      
      viewsLabel.setAttribute( "value", viewsTemplate.replace("{COUNT}", data.total_visits) ); 
      inGroupLabel.setAttribute( "value", inGroupTemplate.replace("{COUNT}", data.in_group) ); 
      
      var previewContainer = snippet.getElementsByClassName("sd_cell_preview_container")[0];
          
      var thumb = null;
      
      if( grabData.status == "thumb_failed" ){
        this._setFailImageForSnippet( snippet, this.cellSize.width ); 
      }
      else{
        if( (thumb = this._previewUrlById( hash)) && grabData.have_preview == 1  ){ 
        
          if( (grabData.thumb_source_type == "local_file" || grabData.thumb_source_type == "force_url") && !grabData.thumb_width && !grabData.thumb_height ){
            needGrabScreenshot = true;    
          }
          else{
            this._setPreviewImageForSnippet( snippet, thumb, this.cellSize.width, grabData.thumb_source_type, {width: grabData.thumb_width, height: grabData.thumb_height} ); 
          }
          
        }
        else{
          needGrabScreenshot = true;
        }
      }
      
      snippet.setAttribute( "tooltiptext", data.url );
      
      snippet.style.margin = this.cellMargin + "px";
    }
    else if(this._displayModeType() == "list"){
      snippet = document.getElementById( "widget_list_elem" ).cloneNode(true);
      this._fillListElemContent( snippet, data, "most_visited" );
    }
    
    this._assignMostVisitedCellEvents( data, snippet );
    
    snippet.setAttribute( "id", "mv_" + hash );
                  
    if( needGrabScreenshot ){
      this._refereshMostVisitedThumbSnippet( snippet, data.url, grabData );   
    }
    else if( fvd_speed_dial_speedDialSSD.refreshMostVisitedUrls.indexOf( data.url ) != -1 ){
      snippet.setAttribute( "loading", "1" ); // element is refreshes or creating now.
    }
    
  
    return snippet;
    
  },
  
  /**
   * 
   * type - type of thumb
   */
  _setPreviewImageForSnippet: function( snippet, imageSrc, cellWidth, type, thumbSize ){    
    var container = snippet.getElementsByClassName( "sd_cell_preview_container" )[0];
    
    function _dbg( msg ){
      //dump( "FVDSD: " + msg + "\n" );
    }
      
    var that = this;  
    
    _dbg( "Assigning preview for element: " + imageSrc + "("+cellWidth+", "+type+", "+JSON.stringify(thumbSize)+")" );
        
    if( container ){
      snippet = container;
    } 
    
    if( type == "force_url" || type == "local_file" ){        
      
      var imgLoadCallback = function(){
        var box = snippet.boxObject;        
        snippet.style.background = "url('"+imageSrc+"')";
        snippet.style.backgroundPosition = "center center"; 
        
        if( img.width > cellWidth || img.height > cellWidth / that.CELLS_RATIO ){         
          snippet.style.backgroundSize = "contain";               
        } 
        snippet.style.backgroundRepeat = "no-repeat";       
      }
      
      var img = null;
      
      if( thumbSize ){
        img = thumbSize;
        imgLoadCallback();
      }
      
      if( !img ){
        
        snippet.style.opacity = 0;
        
        img = new Image();
        img.onload = function(){
          imgLoadCallback();
                    
          snippet.style.opacity = 1;
        }
        img.src = imageSrc;
        
      }
      
      _dbg( "Setuped for special image( force_url, local_file )" );
      
    }
    else{
      /*
      if( !tryCache ){
        snippet.style.opacity = 0;
      }
      */
      
      snippet.style.background = "url('"+imageSrc+"')";
      snippet.style.backgroundSize = cellWidth + "px auto";   
      snippet.style.backgroundRepeat = "no-repeat"; 
      
      
      _dbg( "Setuped for auto image" );
      /*
      if(!tryCache){
        setTimeout( function(){
          snippet.style.opacity = 1;
        }, 0 );
      }
      */
      
    }     
  },
  
  _setFailImageForSnippet: function( snippet, cellWidth ){    
    var container = snippet.getElementsByClassName( "sd_cell_preview_container" )[0];
    
    if( container ){
      snippet = container;
    }
    
    snippet.style.background = "url("+this.failThumbSrc+")";
    snippet.style.backgroundPosition = "center center";   
    snippet.style.backgroundRepeat = "no-repeat";
    
    var cellHeight = cellWidth / this.CELLS_RATIO ;
    
    if( cellHeight < this.FAIL_IMG_HEIGHT ){ 
      snippet.style.backgroundSize = "contain";       
    }   

  },
  
    
  _buildDial: function( data, params ){
    params = params || {};
        
    var snippet = null;
    
    if( this._displayModeType() == "thumbs" ){
      snippet = document.getElementById( "widget_cell" ).cloneNode(true);
      
      this._setCellSize( snippet ); 
      
      snippet.setAttribute( "thumb_size", this._thumnailsMode() );
      
      snippet.setAttribute( "display_title_2", this._getShowUrlInDial() );

      snippet.setAttribute( "topTitle", this._showIconsAndTitles() ? "1" : "0" );
      
      var favicon = snippet.getElementsByClassName("sd_cell_favicon")[0];
      
      //favicon.setAttribute( "src", this._faviconUrl( data.url ) );
      
      this._faviconUrl( data.url, function( favUrl ){
        favicon.setAttribute( "src", favUrl );
      } );
      
      var title = snippet.getElementsByClassName("sd_cell_title")[0];
      var title2 = snippet.getElementsByClassName("sd_cell_title2")[0];
      var labelClicks = snippet.getElementsByClassName("clicks_count")[0];
      
      title.setAttribute( "value", data.title );
      title2.setAttribute( "value", this._removeUrlDetails( data.url ) );
      title.setAttribute( "tooltiptext", data.title );
      labelClicks.setAttribute( "value", fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.top_sites_cell.clicks" ).replace("{COUNT}", data.clicks) );
      //var preview = snippet.getElementsByClassName("sd_cell_preview")[0];
      //preview.setAttribute( "src", this._previewUrlById( "1" ) );   
      
      var previewContainer = snippet.getElementsByClassName("sd_cell_preview_container")[0];
      
      //dump( "\nStart set image for dial\n" );
      //dump( "Thumb src: " + data.thumb_src + "\n" );
      //dump( "Thumb status: " + data.status + "\n" );
      
      if( data.thumb_src ){
        if( data.status == "thumb_failed" ){
          //dump( "Set fail image for dial\n" );
          
          this._setFailImageForSnippet( snippet, this.cellSize.width );                   
                              
          if( this._previewUrlById( data.id ) ){
            
            //dump( "Thumb can be restored\n" );
            
            if( (data.thumb_source_type == "local_file" || data.thumb_source_type == "force_url") && !data.thumb_width && !data.thumb_height ){
              
            }
            else{
              if( data.ignore_restore_previous_thumb != 1 ){
                snippet.setAttribute( "canRestoreThumb", 1 );
              }               
            }
          }
          
        }
        else{
          
          //dump( "Thumb status is OK\n" );
          
          if( (data.thumb_source_type == "local_file" || data.thumb_source_type == "force_url") && !data.thumb_width && !data.thumb_height ){ 
            //dump("Refreshing dial thumb\n");          
            this.updateDialData( data.id );
            snippet.setAttribute( "loading", "1" );   
          }
          else{
            //dump( "Set image to dial element\n" );
            //dump( "Preview url: " + this._previewUrlById( data.id ) + "\n" );
            //dump( "Cell Width: " + this.cellSize.width );
            //dump( "Thumb source type: " + data.thumb_source_type + "\n" );
            //dump( "Thumb size: " + data.thumb_width + "x" + data.thumb_height + "\n" );           
            
            this._setPreviewImageForSnippet( 
              snippet,
              this._previewUrlById( data.id ),
              this.cellSize.width,
              data.thumb_source_type,           
              {width: data.thumb_width, height: data.thumb_height}
            );  
          }
          
        }
      }
      
      snippet.setAttribute( "tooltiptext", data.url );
      
      this._assignCellEvents( snippet, data );
      
      snippet.style.margin = this.cellMargin + "px";
    }
    else if( this._displayModeType() == "list" ){
      var listElemData = {
        title: data.title,
        url: data.url,
        //favicon: this._faviconUrl( data.url ),
        id: data.id,
        group_id: data.group_id
      };
      snippet = document.getElementById( "widget_cell_list" ).cloneNode(true);
      this._fillListElem( snippet, listElemData, "dial" );
    }
    
    if ( !data.thumb_src && fvd_speed_dial_Config.LOAD_PREVIEW ) {
      this.updateDialData( data.id );
      snippet.setAttribute( "loading", "1" );   
    }
    
    if( this._getGroupId() == "all" ){
      // no dragging for all groupping
      snippet.removeAttribute( "ondragstart" );
      snippet.removeAttribute( "ondragover" );
      snippet.removeAttribute( "ondragleave" );
      snippet.removeAttribute( "ondrop" );
    }
    
    snippet.setAttribute( "id", "cell_"+data.id );
    
    return snippet;
  },
    
    _cellsContainer: function(){
        if (!this.container) {
            this.container = document.getElementById("fvd_sd_cells_container");
        }
        return this.container;
    },
  
    _listContainer: function(){
        if (!this.listContainer) {
            this.listContainer = document.getElementById("fvd_sd_list_container");
        }
        return this.listContainer;
    },
  
  _currentContainer: function(){
    
    if( this._displayModeType() == "thumbs" ){
      return this._cellsContainer();
    }
    else if( this._displayModeType() == "list" ){
      return this._listContainer();     
    }
    
  },
  
  _displayNewGroupWindow: function( params ){
    var params = params || {};
    
    openDialog('chrome://fvd.speeddial/content/dialogs/fvd_sd_new_group.xul', '', 'chrome,titlebar,toolbar,centerscreen,modal', params);
    
    if( !params.ok ){
      return false;
    }
    
        return params;
  },
        
    _displayNewDialWindow: function( inputData, isModify, disableItems ){   
        var params = {};
    if( typeof isModify != "undefined" ){
      params.modify = isModify;
    }
    
    for( var k in inputData ){
      params[k] = inputData[k];
    }   
    
    if( disableItems ){
      params.disableItems = disableItems;
    }
    
        openDialog('chrome://fvd.speeddial/content/dialogs/fvd_sd_new_dial.xul', '', 'chrome,titlebar,toolbar,modal,centerscreen', params);
    
    if( !params.ok ){
      return false;
    }
    
        return params;
    },
  
  _viewMostVisitedGroup: function( interval, domain ){
    var params = {
      "interval": interval,
      "domain": domain
    };
    params.wrappedJSObject = params;
    
    //openDialog('chrome://fvd.speeddial/content/dialogs/fvd_sd_view_group.xul', '', 'chrome,titlebar,toolbar,centerscreen,modal', params);
    
      var ww = Components.classes['@mozilla.org/embedcomp/window-watcher;1'].getService(Components.interfaces.nsIWindowWatcher);
        if (ww) {          
      fvd_speed_dial_speedDialSSD.childWindows.push(ww.openWindow(window, 'chrome://fvd.speeddial/content/dialogs/fvd_sd_view_group.xul', '_blank', "dialog=no,centerscreen", params));
        }
  },
    
  _askBlockTypeDialog: function( params ){
    params = params || {};
    openDialog('chrome://fvd.speeddial/content/dialogs/fvd_sd_block.xul', '', 'chrome,titlebar,toolbar,centerscreen,modal', params);
    return params;
  },  
  
  _setAnimStyles: function(elem, set){
    if( set ){
      elem.style.MozTransitionTimingFunction = "ease-in-out";
      elem.style.MozTransitionDuration = fvd_speed_dial_speedDialSSD.animDurationMs + "ms"; 
    }
    else{
      elem.style.MozTransitionTimingFunction = "";
      elem.style.MozTransitionDuration = "";  
    }
  },
    
  _mostVisitedInterval: function(){
    if( !this.mostVisitedInterval ){
      this.mostVisitedInterval = fvd_speed_dial_gFVDSSDSettings.getStringVal( "sd.most_visited_interval" );
    }
    
    return this.mostVisitedInterval;
  },
  
  _mostVisitedGroupBy: function(){
    if( !this.mostVisitedGroupBy ){
      this.mostVisitedGroupBy = fvd_speed_dial_gFVDSSDSettings.getStringVal( "sd.most_visited_group_by" );
    }
    
    return this.mostVisitedGroupBy;
  },
    
    // publics    

  /* returns the active modes list */

  actualModesList: function(){
    var list = this.displayModesList.slice();   
    
    if( !this.enableTopSites ){
      var index = list.indexOf( "top_sites" );      
      list.splice( index, 1 );
    }
    if( !this.enableRecentlyClosed ){
      var index = list.indexOf( "recently_closed" );
      list.splice( index, 1 );
    }   
    if( !this.enableMostVisited){
      var index = list.indexOf( "most_visited" );
      list.splice( index, 1 );
    } 
    
    return list;  
  },

  // circle changes display mode
  cirlceDisplayMode: function( direction ){
    direction = direction || 1;
    
    var list = this.actualModesList();  
    
    var mode = this._displayMode();
    var modeIndex = list.indexOf( mode );
    var nextModeIndex = modeIndex + direction;
    if( nextModeIndex >= list.length ){
      nextModeIndex = 0;
    }
    else if( nextModeIndex < 0 ){
      nextModeIndex = list.length - 1;
    }
    
    var nextMode = list[nextModeIndex];
    
    this.setDisplayType( nextMode );
  },

  clickDial: function( dialId ){
    var clicks = this.storage.clickDial( dialId );    
    
    var cell = this._getDialCell( dialId );
    if( !cell ){
      return;
    }
    
    var labelClicks = cell.getElementsByClassName("clicks_count")[0];
    
    if( !labelClicks ){
      return;
    }
    
    labelClicks.setAttribute( "value", fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.top_sites_cell.clicks" ).replace("{COUNT}", clicks) );
    
    // flushing cache
    fvd_speed_dial_Storage._flushCache();
  },

  refreshMostVisitedSettings2: function(){
    var types = document.getElementById("mostVisitedTypes").getElementsByClassName("group");
    
    for( var i = 0; i != types.length; i++ ){
      types[i].setAttribute( "current", types[i].getAttribute("value") == this._mostVisitedInterval() ? "1" : "0" );      
    }
  },
  
  clearMostVisitedRemovedData: function(){
    var toRefresh = this.storage.getMostVisitedModifiedUrlDataAll();
    
    this.storage.clearMostVisitedModifiedUrlData();
    
    this.storage.clearRemovedMostVisited();
    
    for( var i = 0; i != toRefresh.length; i++ ){     
      this.removeMostVisitedThumb( toRefresh[i].url );
      this.clearImageCacheMostVisited( toRefresh[i].url );
      this._refereshMostVisitedThumb( toRefresh[i].url );
    }
  },
  
  setMostVisitedSearchInterval: function( interval ){   
    if( this._displayMode() != "most_visited" ){ 
      this._setDisplayType( "most_visited" );
    }
  
    fvd_speed_dial_gFVDSSDSettings.setStringVal( "sd.most_visited_interval", interval );
  },
  
  setMostVisitedGroupBy: function( groupBy ){
    if( this._displayMode() != "most_visited" ){ 
      this._setDisplayType( "most_visited" );
    }
  
    fvd_speed_dial_gFVDSSDSettings.setStringVal( "sd.most_visited_group_by", groupBy );
  },
  
  /* Groups functions */
  
  manageGroupsDialog: function(){
    openDialog('chrome://fvd.speeddial/content/dialogs/fvd_sd_manage_groups.xul', '', 'chrome,titlebar,toolbar,centerscreen,modal');
  },
  
  groupsShowList: function(){
    try{
      var list = document.getElementById( "top_sites_groups" ).getElementsByClassName("second_list")[0];
      list.setAttribute( "can_hide", 0 ); 
      list.setAttribute( "displayed", 1 );
    }
    catch( ex ){
      
    }
  },
  
  groupsHideList: function(){   
    try{
      var list = document.getElementById( "top_sites_groups" ).getElementsByClassName("second_list")[0];  
      
      if( list.getAttribute("can_hide") == 1 ){
        return false;
      }
      
      list.setAttribute( "can_hide", 1 ); 
      setTimeout(function(){
        if( list.getAttribute("can_hide") == 1 ){
          list.setAttribute( "displayed", 0 );
        }
      }, 200);
      
    }
    catch( ex ){
      
    }
  },
  
  addGroup: function(  ){
    if( this.storage.groupsCount() >= this.MAX_GROUPS_LIMIT ){
      var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                .getService(Components.interfaces.nsIPromptService);
      promptService.alert( window, 
                 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "alert.sd_max_groups_limit.title"),
                 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "alert.sd_max_groups_limit.text") );
      return false;
    }
    
    var params = this._displayNewGroupWindow(  );
    
    var groupId = null;
    if( params ){
      if( !this.storage.groupExists( params.name ) ){
        groupId = this.storage.addGroup( params );  
        fvd_speed_dial_Sync.syncData( ["groups", "newGroups"], this.storage.groupGlobalId( groupId ) );             
      }
      else{
        var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
        promptService.alert( window, 
                   fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "alert.sd_group_exists.title"),
                   fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "alert.sd_group_exists.text") );
      }
    }
    
    return groupId;
  },  

  
  refereshMakeHomePageStatus: function(){

    var div = parent.document.getElementById( "make_homepage" );    
    
    if( fvd_speed_dial_gFVDSSDSettings.sdIsHomepage() ){
      div.setAttribute( "active", "0" );
    }
    else{
      div.setAttribute( "active", "1" );      
    }

  },
  
  refreshCurrentGroup: function(){
    var currentGroupId = this._getGroupId();
        
    // get all groups
      
    var groupsLabels = document.getElementsByClassName( "group" );
    
    for( var i = 0; i != groupsLabels.length; i++ ){
      if( groupsLabels[i].getAttribute("id").indexOf("group_link_") == -1 ){
        continue;
      }
      
      var groupId = groupsLabels[i].getAttribute("id").replace( "group_link_", "" );
      
      if( groupId == currentGroupId ){
        // remove transitions
        groupsLabels[i].setAttribute( "style", "-moz-transition-duration: 0ms" );
        groupsLabels[i].setAttribute( "current", "1" );               
        groupsLabels[i].setAttribute( "checked", "true" );
        (function( label ){
          setTimeout( function(){
            try{
              label.removeAttribute( "style" );
            }
            catch( ex ){
              
            }
          }, 200 );
        })(groupsLabels[i]);
      }
      else{
        groupsLabels[i].setAttribute( "current", "0" );       
        groupsLabels[i].removeAttribute( "checked" );
      }
    }
    
    this.focusGroupLink( currentGroupId );  
  },
  
  editGroup: function( groupData ){

    var params = fvd_speed_dial_speedDialSSD._displayNewGroupWindow( {
      name: groupData.name,
      sync: groupData.sync
    });   
    if( params.ok ){
      var useGroupId = this.storage.groupIdByName( params.name );
      if( useGroupId != false && useGroupId != groupData.id ){
        var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
        promptService.alert( window, 
                   fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "alert.sd_group_exists.title"),
                   fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "alert.sd_group_exists.text") );
        return false;
      }
      this.storage.updateGroupData( groupData.id, {
        name: params.name,
        sync: params.sync
      } );
        
      fvd_speed_dial_Sync.syncData( "groups", this.storage.groupGlobalId( groupData.id ) );   
            
    }
  },
  
  removeGroup: function( id ){
    if( this.storage.canRemoveGroups() ){
      var count = this.storage.count( id );
      
      if( count > 0 ){
        var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
        var r = promptService.confirm( window, 
                   fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "confirm.sd_group_have_dials.title"),
                   fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "confirm.sd_group_have_dials.text").replace("{COUNT}", count) );
                   
        if( r ){
          var dials = this.storage.listDials( true, id );
          
          try{
            for( var i = 0; i != dials.length; i++ ){           
              this.removeDial( dials[i].id, true ); 
            }           
          }
          catch( ex ){
            
          }
        }
        else{
          return false;
        }
        
      }
      
      fvd_speed_dial_Sync.syncData( "deleteGroups", this.storage.groupGlobalId( id ) );
      
      this.storage.removeGroup( id );   
      
    }
    else{
      var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                .getService(Components.interfaces.nsIPromptService);
      var r = promptService.alert( window, 
                       fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "alert.sd_cannot_remove_group.title"),
                       fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "alert.sd_cannot_remove_group.text") );
    } 
  },
  
  afterRemovingGroupPreparations: function(){
    
    this.currentGroupId = null;
    this.refreshGroupsList();
    this.refreshCurrentGroup();
        
    
        
    var defaultGroupId = fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.default_group");
    if( defaultGroupId > 0 && !this.storage.groupExistsById( defaultGroupId ) ){
      var id = this.storage.returnAnotherGroupIfNotExists( 0 );
      if( id ){
        fvd_speed_dial_gFVDSSDSettings.setStringVal( "sd.default_group", id );        
      }
    }
    
  },
  
  editPopupedGroup: function(){
    if( fvd_speed_dial_speedDialSSD.popupedGroupFromGroupBox ){
      fvd_speed_dial_speedDialSSD.editGroup(fvd_speed_dial_speedDialSSD.popupedGroupFromGroupBox);
    }
  },
  
  removePopupedGroup: function(){
    if( fvd_speed_dial_speedDialSSD.popupedGroupFromGroupBox ){
      fvd_speed_dial_speedDialSSD.removeGroup(fvd_speed_dial_speedDialSSD.popupedGroupFromGroupBox.id);
    }
  },
  
  refreshAllPopupedGroupDials: function(){
    if( fvd_speed_dial_speedDialSSD.popupedGroupFromGroupBox ){ 
      var dials = this.storage.listDials( false,
                          fvd_speed_dial_speedDialSSD.popupedGroupFromGroupBox.id,
                        fvd_speed_dial_speedDialSSD.popupedGroupFromGroupBox.id == "all" ? fvd_speed_dial_gFVDSSDSettings.getIntVal( "sd.all_groups_limit_dials" ) : null );
      for( var i = 0; i != dials.length; i++ ){
        fvd_speed_dial_speedDialSSD.updateDialData( dials[i].id );
      }
    }
  },
  
  openAllPopupedGroupLinks: function(){
    if( fvd_speed_dial_speedDialSSD.popupedGroupFromGroupBox ){     
      var grouId = fvd_speed_dial_speedDialSSD.popupedGroupFromGroupBox.id; 
      var data = this.storage.listDials( false, grouId, grouId == "all" ? fvd_speed_dial_gFVDSSDSettings.getIntVal( "sd.all_groups_limit_dials" ) : null );
      
      for( var i = 0; i != data.length; i++ ){
        this._navigate( data[i].url, null, null, "new_tab_passive" );
        this.clickDial( data[i].id );
      } 
    }   
  },
  
  setPopupedGroupAsDefault: function(){
    fvd_speed_dial_speedDialSSD._setDefaultGroupId( fvd_speed_dial_speedDialSSD.popupedGroupFromGroupBox.id );
  },  
  
  whiteSpaceMenuFill: function( menu ){

    var colsRowsMenu = menu.querySelector( "[cols_label]" );
                
    if( this.actualScrollingMode() == "horizontal" ){
      colsRowsMenu.setAttribute( "label", colsRowsMenu.getAttribute( "rows_label" ) );                  
    }
    else if( this.actualScrollingMode() == "vertical" ){
      colsRowsMenu.setAttribute( "label", colsRowsMenu.getAttribute( "cols_label" ) );        
    }
    
    try{
      var scrollingTypeMenu = menu.querySelector(".scrollingTypeMenu");
      if( this._thumnailsMode() == "list" ){
        scrollingTypeMenu.setAttribute("disabled", true);
      }
      else{
        scrollingTypeMenu.removeAttribute("disabled");
      }
    }
    catch( ex ){
      
    }
    
  },
  
  fillPopupMenuColumns: function( menuId ){
    
    try{
      
      var that = this;
      
      var setValue = function( v ){
        try{
          if( that._displayMode() == "top_sites" ){
            fvd_speed_dial_gFVDSSDSettings.setStringVal( "sd.top_sites_columns", v );
          }
          else if( that._displayMode() == "most_visited" ){
            fvd_speed_dial_gFVDSSDSettings.setStringVal( "sd.most_visited_columns", v );
          }
          else if( that._displayMode() == "recently_closed" ){
            fvd_speed_dial_gFVDSSDSettings.setStringVal( "sd.recently_closed_columns", v );
          }   
        }
        catch(ex){
          alert(ex);
        }
        
        
      }
      
      var menu = document.getElementById( menuId );
      var menuParent = menu.parentNode;
      
      while( menu.firstChild ){
        menu.removeChild( menu.firstChild );
      }

      var columnsAuto = null;   
            
      if( this.actualScrollingMode() == "horizontal" ){
        columnsAuto = this.optimalInCol;                    
      }
      else if( this.actualScrollingMode() == "vertical" ){
         columnsAuto = this.optimalInRow;           
      }
      
      
      var preValue = null;
  
      if( this._displayMode() == "top_sites" ){
        preValue = fvd_speed_dial_gFVDSSDSettings.getStringVal( "sd.top_sites_columns" );
      }
      else if( this._displayMode() == "most_visited" ){
        preValue = fvd_speed_dial_gFVDSSDSettings.getStringVal( "sd.most_visited_columns" );
      } 
      else if( this._displayMode() == "recently_closed" ){
        preValue = fvd_speed_dial_gFVDSSDSettings.getStringVal( "sd.recently_closed_columns" );
      } 
      
      var numOfColumns = columnsAuto;
      if( preValue != "auto" ){
        if( preValue > columnsAuto ){
          numOfColumns = preValue;
        }
      }
            
      var menuitem = document.createElement("menuitem");

      menuitem.setAttribute( "type", "radio" );
      menuitem.setAttribute( "label", fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.search", "columns_auto" ) );
      menuitem.setAttribute( "value", "auto" );
      
      menuitem.addEventListener( "click", function(){
        setValue("auto");
      }, false );
      
      if( "auto" == preValue ){
        menuitem.setAttribute( "checked", "true" );
      }
      
      menu.appendChild( menuitem );
          
      for( var columnNum = 1; columnNum <= numOfColumns; columnNum++ ){
        var menuitem = document.createElement("menuitem");
  
        menuitem.setAttribute( "type", "radio" );
        menuitem.setAttribute( "label", columnNum );
        menuitem.setAttribute( "value", columnNum );
        
        (function(columnNum){
          menuitem.addEventListener( "click", function(){
            setValue(columnNum);
          }, false );
        })(columnNum);
        
        if( columnNum == preValue ){
          menuitem.setAttribute( "checked", "true" );
        }
        
        menu.appendChild( menuitem );
      }
      
    }
    catch( ex ){
      alert(ex);
    }
    
  },
  
  _processGroupPopupShowing: function( event ){
    try{
      var groupElem = event.rangeParent;
      var groupId = groupElem.getAttribute("id").replace( "group_link_", "" );
      
      var group = this.storage.getGroupById(groupId);
      
      var defaultGroupPopupSetter = document.getElementById( "groupMenuPopupDefault" );
      defaultGroupPopupSetter.setAttribute( "checked", fvd_speed_dial_speedDialSSD._defaultGroupId({settingsValue:true}) == groupId );
    
      var lastSelectedGroupSetter = document.getElementById( "groupMenuPopupDefaultLastSelected" );
      lastSelectedGroupSetter.setAttribute( "checked", fvd_speed_dial_speedDialSSD._defaultGroupId({settingsValue:true}) == -1 );
    
      var syncThisGroup = document.getElementById( "groupMenuPopupSyncThisGroupSelected" );
      syncThisGroup.setAttribute( "checked", group.sync == 1 ? true : false );      
    
      fvd_speed_dial_speedDialSSD.popupedGroupFromGroupBox = group;
    }
    catch( ex ){
      
    }
  },
  
  _addGroupElemEvents: function( hbox, group ){
    hbox.onclick = function( event ){
          
      if( event.button != 2 ){
        document.getElementById( "additional_groups_list" ).hidePopup();
      }
                        
      //if( event.button != 2 ){
        if( fvd_speed_dial_speedDialSSD._getGroupId() != group.id ){
          fvd_speed_dial_speedDialSSD.setCurrentGroup( group.id );
          fvd_speed_dial_speedDialSSD.buildCells(  ); 
        }
        
                                    
        event.stopPropagation();
      //}
      //else{
        
            
        
        
      //}
    }
  },
  
  refreshGroupsList: function( params ){
    params = params || {
      rebuildMainGroupsList: true,
      rebuildPopupMoveToGroupsList: true
    };
    
    var allGroupContainer = document.getElementById( "allGroupContainer" );
    
    var groups = this.storage.getGroupsList();
    /*
    var container = document.getElementById("top_sites_groups_list");
    */

    var groupsBoxMaxWidth = parent.window.innerWidth - 430;
    
    var groupsActiveWidth = 0;
    var maxGroupsInMainList = 0;
        
    if( fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.enable_popular_group") ){
      groupsActiveWidth += this.GROUP_X_PADDING * 2 + this.GROUP_LETTER_WIDTH * allGroupContainer.textContent.length + this.GROUP_MARGIN;
    }
    
    if( this.canRestorePreviousSession() ){
      groupsActiveWidth += this.GROUP_MARGIN + document.getElementById("restoreSessionContainer").getElementsByClassName("group")[0].boxObject.width;
    }
    
    for( var i = 0; i != groups.length; i++ ){
      var groupSize = (groups[i].name + "("+this.storage.count(groups[i].id)+")").length * this.GROUP_LETTER_WIDTH + this.GROUP_X_PADDING * 2 +  + this.GROUP_MARGIN;
      if( groupSize > this.GROUP_WIDTH ){
        groupSize = this.GROUP_WIDTH;
      }
      groupsActiveWidth += groupSize;
      
      if( groupsActiveWidth >= groupsBoxMaxWidth ){
        break;
      }
      
      maxGroupsInMainList++;
    }
  
    var container = document.getElementById("groups_list");
    var menuContainer = document.getElementById( "topSitesMoveToGroups" );
    
    if( params.rebuildMainGroupsList ){
      // clear container
      while( container.firstChild ){
        container.removeChild(container.firstChild);
      }
    }
    
    if( params.rebuildPopupMoveToGroupsList ){
      while( menuContainer.firstChild ){
        menuContainer.removeChild( menuContainer.firstChild );
      }   
    }
    
    if (params.rebuildPopupMoveToGroupsList) {
      for( var i = 0; i != groups.length; i++ ){
        // add to menu container
        var menuItem = document.createElement( "menuitem" );
        menuItem.setAttribute( "label", groups[i].name ); 
        menuItem.setAttribute( "groupId", groups[i].id );
              
        (function(group){
          menuItem.onclick = function(){
            fvd_speed_dial_speedDialSSD.movePopupedDial( group.id );
          } 
        })( groups[i] );
        
        menuContainer.appendChild( menuItem );  
      }
    }
    
    function _setupDragging( elem ){
      
      elem.addEventListener( "dragover", function( event ){
        var dialId = event.dataTransfer.getData( fvd_speed_dial_speedDialSSD.DND_DIALS_TYPE );
        
        if( dialId ){         
          elem.setAttribute("dragover", 1);
          event.stopPropagation();
          event.preventDefault();               
        }
      }, false );
      
      elem.addEventListener( "drop", function( event ){
        var dialId = event.dataTransfer.getData( fvd_speed_dial_speedDialSSD.DND_DIALS_TYPE );
        
        if( dialId ){ 
          
          var groupId = parseInt( elem.getAttribute("id").replace( "group_link_", "" ) );       
          var currentGroupId = fvd_speed_dial_speedDialSSD.storage.getDialById( dialId ).group_id;              
          if( groupId != currentGroupId ){
            
            fvd_speed_dial_speedDialSSD.moveDial( dialId, groupId );
                        
          }
          
          event.stopPropagation();
          event.preventDefault();
        }
      }, false );
      
      elem.addEventListener( "dragleave", function(){
        elem.removeAttribute("dragover");
      }, false );
      
    }
    
    if (params.rebuildMainGroupsList) {     
      if( fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.enable_popular_group") ){
        allGroupContainer.removeAttribute("hidden");
      }
      else{
        allGroupContainer.setAttribute( "hidden", true );
      }
      
      var mainGroupsList = groups.splice( 0, maxGroupsInMainList );
    
      for( var i = 0; i != mainGroupsList.length; i++ ){
      
        var group = mainGroupsList[i];
      
        var hbox = document.createElement( "hbox" );
                
        hbox.setAttribute( "context", "group_menu_full" );
        
        var vbox = document.createElement( "vbox" );
        
        _setupDragging( vbox );
        
        vbox.className = "group"
        vbox.setAttribute( "current", "0" );
        vbox.setAttribute( "flex", "2" );
        vbox.setAttribute( "id", "group_link_"+group.id  );
        var label = document.createElement("label");
        label.setAttribute( "value", group.name + " ("+this.storage.count(group.id)+")" );
        label.setAttribute( "crop", "right" );
        
        vbox.appendChild(label);
        hbox.appendChild(vbox);
        
        this._addGroupElemEvents( hbox, group );        
        
        container.appendChild( hbox );
      }
      
      var buttonAdditionalGroups = document.getElementById("groupsBox").getElementsByClassName("slider")[0];
      
      if( groups.length > 0 ){
        buttonAdditionalGroups.removeAttribute("disabled");
        var menu = document.getElementById( "additional_groups_list" ).getElementsByTagName("arrowscrollbox")[0];
        while( menu.firstChild ){
          menu.removeChild(menu.firstChild);
        }
        for( var i = 0; i != groups.length; i++ ){
          var group = groups[i];
          
          var menuitem = document.createElement( "hbox" );
          var label = document.createElement( "label" );
          label.setAttribute( "value", group.name + " ("+this.storage.count(group.id)+")" );
          menuitem.setAttribute( "id", "group_link_"+group.id  );
          label.setAttribute( "crop", "right"  )
          menuitem.setAttribute( "context", "group_menu_full"  )
          menuitem.className = "group";
          
          menuitem.appendChild( label );
          
          this._addGroupElemEvents( menuitem, group );
          
          menu.appendChild( menuitem );
        }
        
        var separator = document.createElement( "separator" );
        separator.className = "groove";
        
        menu.appendChild( separator );
        
        var menuitem = document.createElement( "hbox" );
        menuitem.className = "group";
        var label = document.createElement( "label" );
      
        label.setAttribute( "value", fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.manage_groups" ) );
              
        menuitem.appendChild( label );      
                
        menuitem.addEventListener( "click", function( event ){
          
          fvd_speed_dial_speedDialSSD.manageGroupsDialog();
          
          event.stopPropagation();
          
        }, false );       
                
        menu.appendChild( menuitem );
      }
      else{
        buttonAdditionalGroups.setAttribute("disabled", "1");       
      }
      
    }
    

    
    

    
    // set all groups label and count
    
    this.refreshGroupsListAllGroupsLabel();
  },
  
  refreshGroupsListAllGroupsLabel: function(){
    var title = fvd_speed_dial_FVDSSDToolbarProperties.getString("fvd.toolbar", "sd.all_group.title" ) 
          + " (" + Math.min(fvd_speed_dial_gFVDSSDSettings.getIntVal( "sd.all_groups_limit_dials" ), this.storage.count(null, {
            uniqueUrl: true
          }) ) + ")"; 
    document.getElementById("group_link_all").getElementsByTagName("label")[0].setAttribute("value", title);
  },
  
  groupBoxIsOverflowed: function(){
    var groupsBox = document.getElementById( "groupsBox" );
    return groupsBox.scrollWidth > groupsBox.clientWidth;
  },
  
  setCurrentGroup: function( groupId ){
    if( this._displayMode() != "top_sites" ){
      this._setDisplayType( "top_sites" );
    }
    else{
      if( groupId == this._getGroupId() ){
        return false;
      }       
    }
    
    fvd_speed_dial_gFVDSSDSettings.setStringVal( "sd.last_opened_group", groupId );   
    
    this.currentGroupId = groupId;  
    this.refreshCurrentGroup();
  },
  
  adjustGroupsSliderDisplaying: function( event ){
    var groupsBox = document.getElementById( "groupsBox" );
    
    var disableLeftScroll = 0;
    var disableRightScroll = 0;
    
    if( groupsBox.scrollLeft == 0 ){
      disableLeftScroll = 1;
    }
    
    if( groupsBox.scrollLeft == groupsBox.scrollWidth - groupsBox.boxObject.width ){
      disableRightScroll = 1;
    }
    
    var groupsBoxParent = document.getElementById( "groupsBoxParent" );
    var leftScroll = groupsBoxParent.getElementsByClassName( "slider left" )[0];
    var rightScroll = groupsBoxParent.getElementsByClassName( "slider right" )[0];
    
    leftScroll.setAttribute( "disabled", disableLeftScroll );
    rightScroll.setAttribute( "disabled", disableRightScroll );
  },
  
  focusGroupLink: function( groupId ){
    if( this.groupBoxIsOverflowed() ){
      var groupLink = document.getElementById( "group_link_" + groupId );
      
      if( groupLink ){
        var groupsBox = document.getElementById( "groupsBox" );
        
        var groupLeft = groupLink.boxObject.x;
        var groupRight = groupLeft + groupLink.boxObject.width;
        
        var visibleRegion = {
          start: groupsBox.scrollLeft,
          end: groupsBox.scrollLeft + groupsBox.boxObject.width
        };    
        
        // get slider width
        var sliderWidth = 0;
        
        try{              
          sliderWidth = groupsBox.boxObject.x;
        }
        catch( ex ){

        } 
        
        visibleRegion.start += sliderWidth;
        visibleRegion.end += sliderWidth;
                                        
        if( groupLeft >= visibleRegion.start && groupRight <= visibleRegion.end ){
          
        }
        else if( groupLeft < visibleRegion.start ){
          groupsBox.scrollLeft = groupLeft - sliderWidth;
        }
        else if( groupRight > visibleRegion.end ){
          groupsBox.scrollLeft = groupLeft - sliderWidth;         
        }
      }
      

    }
  },
  
  removeDenyDials: function(){
    var dials = this.storage.listDials();
    for( var i = 0; i != dials.length; i++ ){
      if( this._isDenyUrl(dials[i].url) ){
        this.removeDial( dials[i].id, true );
      }
    }
  },
  
  insertDial: function( dialId, relDialId, insertType ){

    
    try{
      var listChangedDials = fvd_speed_dial_speedDialSSD.storage.insert( dialId, relDialId, insertType );
      if( listChangedDials != false ){
        for( var i = 0; i != listChangedDials.length; i++ ){
          try{
            var elem = document.getElementById( "cell_"+listChangedDials[i] );
            fvd_speed_dial_speedDialSSD._setAnimStyles(elem, true);       
            
            elem.style.opacity = 0;
            
            fvd_speed_dial_Sync.syncData( "dials", this.storage.dialGlobalId( listChangedDials[i] ) );
            
            //dump( "CHANGED: " + listChangedDials[i] + "\n" );   
          }
          catch( ex ){
            dump(ex + "\n");
          }
        }
        
        setTimeout(function(){
          
          fvd_speed_dial_speedDialSSD.buildCells( {useImageCache: true} );
          
        }, fvd_speed_dial_speedDialSSD.animDurationMs );
        
      }
    }
    catch( ex ){
      dump(ex + "\n");    
    }

  },
  
  swapDials: function( fromId, toId ){

    
    if( fromId == toId ){
      return false;
    }
    
    var fromElem = document.getElementById( "cell_"+fromId );
    var toElem = document.getElementById( "cell_"+toId );
    
    if( !fromElem || !toElem ){
      //dump( "IElement not found!\r\n" );
      return false;
    }
    
    this._setAnimStyles(fromElem, true);
    this._setAnimStyles(toElem, true);        
  
    fromElem.style.opacity = 0;   
    toElem.style.opacity = 0;
    
    (function(from, to, fromId, toId){
      setTimeout( function(){
        var cloneTo = to.cloneNode(true);   
        var cloneFrom = from.cloneNode(true);   
        from.parentNode.replaceChild(cloneTo, from);
        to.parentNode.replaceChild(cloneFrom, to);
        fvd_speed_dial_speedDialSSD._setAnimStyles( cloneTo );
        fvd_speed_dial_speedDialSSD._setAnimStyles( cloneFrom );
        
        
        
        cloneTo.style.opacity = "";   
        cloneFrom.style.opacity = "";
        
        fvd_speed_dial_speedDialSSD._setAnimStyles(cloneTo, false);
        fvd_speed_dial_speedDialSSD._setAnimStyles(cloneFrom, false);
        
        var fromDial = fvd_speed_dial_speedDialSSD.storage.getDialById( fromId );
        var toDial = fvd_speed_dial_speedDialSSD.storage.getDialById( toId );
        
        if( !fromDial || !toDial ){
          //dump( "Fail get dial info\r\n" );
          return false;
        }
        
        fvd_speed_dial_speedDialSSD._assignCellEvents( cloneFrom, fromDial );
        fvd_speed_dial_speedDialSSD._assignCellEvents( cloneTo, toDial );               
              
        
        fvd_speed_dial_speedDialSSD.storage.updateDialData( fromId, {"position": toDial.position} );
        fvd_speed_dial_speedDialSSD.storage.updateDialData( toId, {"position": fromDial.position} );
        
      }, fvd_speed_dial_speedDialSSD.animDurationMs );
    })(fromElem, toElem, fromId, toId);     

    fvd_speed_dial_Sync.syncData( "dials", this.storage.dialGlobalId( fromId ) );
    fvd_speed_dial_Sync.syncData( "dials", this.storage.dialGlobalId( toId ) );   
    
    return true;
  },
  
  denyUrl: function( uri ){
    var result = this._askBlockTypeDialog( {"uri": uri} );
    if( !result || !result.success ){
      return false;
    }
    
    if( this.storage.denyExists( result.uri, result.type ) ){
      var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                .getService(Components.interfaces.nsIPromptService);
      promptService.alert( window, 
                 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "alert.sd_already_blocked.title"),
                 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "alert.sd_already_blocked.text") );
    }
    else{
      this.storage.denyUrl(result.uri, result.type);        
    }
  },
  
  removeDialWithConfirm: function( dialId ){
    
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                              .getService(Components.interfaces.nsIPromptService);
                    
    /*
                    
    var r = promptService.confirm( window, 
               fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "confirm.remove_dial.title"),
               fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "confirm.remove_dial.text"));
    */
    
    var dial = fvd_speed_dial_speedDialSSD.storage.getDialById( dialId );
    
    var button = fvd_speed_dial_Dialogs.open( {
      window: window,
      buttons: {
        "accept": fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "dialogs.ok"),
        "cancel": fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "dialogs.cancel"),        
      },
      type: "confirm",
      title: fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "confirm.remove_dial.title"),
      text: fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "confirm.remove_dial.text"),
      
      onShow: function( doc ){
        
        var labelTitle = document.createElement("label");
        labelTitle.setAttribute( "value", dial.title );
        labelTitle.setAttribute( "tooltiptext", dial.title );
        labelTitle.setAttribute( "crop", "end" );
        labelTitle.style.maxWidth = "300px";
        
        var labelUrl = document.createElement("label");
        labelUrl.setAttribute( "value", dial.url );
        labelUrl.setAttribute( "tooltiptext", dial.url );       
        labelUrl.setAttribute( "crop", "end" );
        labelUrl.style.maxWidth = "300px";
              
        doc.getElementById("descriptionBox").appendChild( labelTitle );
        doc.getElementById("descriptionBox").appendChild( labelUrl );       
        
      }     
    } );    
        
    if( button == "accept" ){
      fvd_speed_dial_speedDialSSD.removeDial( dialId );           
    }
    
        
    
  },
  
  removeDial: function( id, notRebuild ){
    var file = this._previewFileById( id );
    try{
      file.remove(false);
    }
    catch( ex ){
      
    }
    
    fvd_speed_dial_Sync.syncData( "deleteDials", this.storage.dialGlobalId( id ) );
    
    this.storage.remove( id );
    
    if( !notRebuild ){
      this.buildCells(  );      
    }
  },
  
  moveDial: function( dialId, groupId ){
    
    var group = fvd_speed_dial_Storage.getGroupById( groupId );
    
    if( group.sync == 0 ){
      
      if( fvd_speed_dial_gFVDSSDSettings.getBoolVal( "sd.display_move_to_nosync" ) ){
        
        var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
        
        var checkState = {
          value: false
        };
                  
        var result = promptService.confirmCheck( window, 
                   fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "dialog.sync.move_to_nosync.title"),
                   fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "dialog.sync.move_to_nosync.text"),
                   fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "sd.alert.dont_show_again"), checkState );
        
        if( checkState.value ){
          
          fvd_speed_dial_gFVDSSDSettings.setBoolVal("sd.display_move_to_nosync", false);
          
        }
        
        if( !result ){
          return;
        }
        
      }
      
    }
    
    this.storage.moveDial( dialId, groupId );
    
    fvd_speed_dial_Sync.syncData( "dials", this.storage.dialGlobalId( dialId ) );
    
    if( this._displayMode() == "top_sites" ){
      this.buildCells();
    }
  },
  
  updateDialData: function( dialId ){
    var cell = this._getDialCell( dialId );   
    if( cell ){
      cell.setAttribute( "loading", "1" );
    }   
    
    fvd_speed_dial_ScreenController.refreshSpeedDialPreview( dialId );    
  },
  
  openAllListElems: function(){
  
    var data = null;
  
    if( this._displayMode() == "recently_closed" ){
      var data = this._getRecentClosedTabs( fvd_speed_dial_gFVDSSDSettings.getIntVal("sd.max_recently_closed_records") );
    }
    else if( this._displayMode() == "most_visited" ){
      data = this._getMostVisitedTabs( fvd_speed_dial_gFVDSSDSettings.getIntVal("sd.max_most_visited_records"), this._mostVisitedInterval(), this._mostVisitedGroupBy() );  
    }
    
    
    for( var i = 0; i != data.length; i++ ){
      this._navigate( data[i].url, null, "blank" );
    }

  },
  
  clickProcess: function(){
    try{
      parent.HtmlSearch.clickFrame();
      this.blurUrlBar();      
    }
    catch( ex ){
      
    }
  },
  
  blurUrlBar: function(){
    // blur url bar
    try{
      fvd_speed_dial_gFVDSSD.document().getElementById("urlbar").blur();      
    }
    catch(ex){

    }
  },
  
  setupBodyDial: function(){
    // setup body dial
    
    var bodyDial = document.getElementById( "body_dial" );
    bodyDial.setAttribute( "displayModeType", this._displayModeType() );
    var actualDisplayModeType = this._displayModeType();
    if( !this.expandState() ){
      actualDisplayModeType = "collapsed";
    }
    
    if( PowerOff.isHidden() ){
      actualDisplayModeType = "collapsed";
    }
    
    document.getElementById("speedDialContent").setAttribute( "actualDisplayModeType", actualDisplayModeType );   
    
    this.parentDocument.body.setAttribute( "actualDisplayModeType", actualDisplayModeType );
    
    this.refreshCollapsedMessage();
    
  },
  
  refreshCollapsedMessage: function(){
    
    //if( this.expandState() ){
      //expanded now
    //  return;
    //}
    
    var expandMessage = document.querySelector( "#expandMessageParent" );
    
    if( PowerOff.isHidden() ){
      expandMessage.removeAttribute( "hidden" );    
    }
    else{     
      
      var prefName = "dont_display_collapsed_message.nopoweroff";
      
      if( fvd_sd_PowerOff.isEnabled() ){
        prefName = "dont_display_collapsed_message.poweroff";
      } 
      
      if( fvd_speed_dial_gFVDSSDSettings.getBoolVal( prefName ) ){
        expandMessage.setAttribute( "hidden", true );
      }     
      else{
        expandMessage.removeAttribute( "hidden" );        
      }
      
    }
    
  },
  
  rebuildCellById: function( id ){
    
    try{
      var dial = this.storage.getDialById( id );
      var cell = this._buildDial( dial );
      var currentCell = document.getElementById( "cell_"+id );
      currentCell.parentNode.replaceChild( cell, currentCell );
    }
    catch( ex ){
      alert(ex);
    }
    
  },
  
    buildCells: function( params ){   
    //dump("RUN BUILD!!!\r\n");
    var that = this;
    
    if( this.passiveMode ){
      return false;
    }
    
    if( !this.storage ){
      //dump( "Storage not found!\r\n" );
      return;
    }
    
    this.setupBodyDial();
    
    
    // save window scrolling
    var windowScrollY = parent.scrollY;
    var cellContainerScrollLeft = document.getElementById( "fvd_sd_cells_container" ).scrollLeft;
        
    function _emptyContainers(){
      
      // remove all cells
      var container = that._cellsContainer();
      while( container.firstChild ){
        container.removeChild( container.firstChild );
      } 
      
      container = that._listContainer();
      while( container.firstChild ){
        container.removeChild( container.firstChild );
      } 
      
    }

        
    var hboxListType = document.getElementById( "hboxListType" );
    var hboxListTypeHidden = true;
    
    //this.adaptFrameSize();  
    
    // refreshes
    this.refreshDisplayType();

    this._cellsContainer().setAttribute( "display_mode", this._displayMode() );   
  
    
  
    if( this._displayMode() == "top_sites" ){
      // build cells    
          var dials = this.storage.listDials( false, this._getGroupId(), this._getGroupId() == "all" ? fvd_speed_dial_gFVDSSDSettings.getIntVal( "sd.all_groups_limit_dials" ) : null );
    
      this.adaptCellsSize(dials.length);        
      
      _emptyContainers();
      
      var foundEmptyPluses = false;
      
      if( this._displayModeType() == "thumbs" ){
          
        // build thumbs
        var row;
        
        var dialToFocus = null;
        
        var middle = Math.floor( this.inRow / 2 );
        
            for (var i = 0; i != dials.length; i++) {   
          if( i % this.inRow == 0 ){
            row = document.createElement("hbox");
            row.setAttribute("align", "left");
            this._cellsContainer().appendChild(row);    
          }
          
          if( dials[i] == "plus" ){
            if( this._displayPlusCells() ){
                  dial = this._buildPlusCell();             
            }
          }
          else if( dials[i] == "empty_plus" ){
            if (this._displayPlusCells()) {
              dial = this._buildPlusCell(true, i);
            }
          }
          else{
            dial = this._buildDial( dials[i], params );
          }     
                
          if( this._addedDialId == dials[i].id ){
            
            dialToFocus = dial;
            
          }         
          
          row.appendChild( dial );            
            } 
        
        var countCellsInNotFullRow = dials.length % this.inRow;
        var countPlusCells;
        
        if( countCellsInNotFullRow == 0 ){
          // create new row
          row = document.createElement("hbox");
          row.setAttribute("align", "left");
          this._cellsContainer().appendChild(row);  
        }     

        this._addedDialId = null;
        
        // if current group is all and count of dials >= max count in all group display only one plus cell
        
        if( this._getGroupId() == "all" &&  dials.length >= fvd_speed_dial_gFVDSSDSettings.getIntVal( "sd.all_groups_limit_dials" )  ){
          countPlusCells = 1;
        }
        else{
          // need to add plus cells to end of row
          if( countCellsInNotFullRow == 0 ){
            // all rows filled completely
            countPlusCells = this.inRow;
          }     
          else{
            countPlusCells = this.inRow - countCellsInNotFullRow;
          } 
        }
        
        if(this._displayPlusCells()){
          for( var i = 0; i < countPlusCells; i++ ){
            var dial = this._buildPlusCell();
            row.appendChild( dial );                            
          }
        }
        
        if( dialToFocus ){
          parent.HtmlSearch.scrollToDial( dialToFocus.boxObject );  
        }
        

      }
      else{
        
        // calculate dials in column
        
        var inColumn = Math.ceil( dials.length / this.inRow );
        var nowInColumn = 0;
                
        // build list
        var column = null;
            for (var i = 0; i != dials.length; i++) {           
          if( dials[i] == "plus" ){
                 continue; // no plus cell fol dials in list type
          }
          else{
            dial = this._buildDial( dials[i] );
          }     
                
          if( !column ){
            column = document.createElement("vbox")
          }
          nowInColumn++;          
          column.appendChild( dial );
          
          if( nowInColumn >= inColumn ){
            this._listContainer().appendChild( column );  
            column = null;
            nowInColumn = 0;
          }
            }
        
        if( column ){
          this._listContainer().appendChild( column );  
        }
        
        if( dials.length > 0 ){
          hboxListTypeHidden = false;
        }
        
        // hide NOT top_sites special list block items
        document.getElementById("list_no_items").style.display = "none";
        document.getElementById("list_menu2").style.display = "none";           
        document.getElementById("list_add_dial").style.display = "";
      }
    }
    else if( this._displayMode() == "most_visited" ){
      
      var data = this._getMostVisitedTabs( fvd_speed_dial_gFVDSSDSettings.getIntVal("sd.max_most_visited_records"), this._mostVisitedInterval(), this._mostVisitedGroupBy() );
      
      this.adaptCellsSize(data.length);       
      
      _emptyContainers();
      
      if( this._displayModeType() == "thumbs" ){
        // build thumbs
        
            for (var i = 0; i != data.length; i++) {    
          if( i % this.inRow == 0 ){
            var row = document.createElement("hbox");
            row.setAttribute("align", "left");
            this._cellsContainer().appendChild(row);    
          }
          
          
          var cell = this._buildMostVisitedCell( data[i] );                         
      

               
          row.appendChild( cell );            
            }       
      }
      else{       
        // build list
        
        var inColumn = Math.ceil( data.length / this.inRow );
        var nowInColumn = 0;
    
        // build list
        var column = null;
            for (var i = 0; i != data.length; i++) {            
  
          var dial = this._buildMostVisitedCell( data[i] );               
                
          if( !column ){
            column = document.createElement("vbox")
          }
          nowInColumn++;          
          column.appendChild( dial );
          
          if( nowInColumn >= inColumn ){
            this._listContainer().appendChild( column );  
            column = null;
            nowInColumn = 0;
          }
            }
        
        if( column ){
          this._listContainer().appendChild( column );  
        }
      
        document.getElementById("list_add_dial").style.display = "none";  
        
        if( data.length == 0 ){
          document.getElementById("list_no_items").style.display = "";
          document.getElementById("list_menu2").style.display = "none";     
        }
        else{
          document.getElementById("list_no_items").style.display = "none";
          document.getElementById("list_menu2").style.display = "";   
        } 
        
        if( data.length > 0 ){
          hboxListTypeHidden = false;
        }     
      }
    }
    else if( this._displayMode() == "recently_closed" ){
      // hide dial list items
      document.getElementById("list_add_dial").style.display = "none";
      
      displayModeType = "list"; 
      
      var tabs = this._getRecentClosedTabs( fvd_speed_dial_gFVDSSDSettings.getIntVal("sd.max_recently_closed_records") );
      
      this.adaptCellsSize( tabs.length );     
      
      _emptyContainers();
      
      var inColumn = Math.ceil( tabs.length / this.inRow );
      var nowInColumn = 0;
              
      // build list
      var column = null;
          for (var i = 0; i != tabs.length; i++) {            

        var dial = this._buildListElem( tabs[i] );            
              
        if( !column ){
          column = document.createElement("vbox")
        }
        nowInColumn++;          
        column.appendChild( dial );
        
        if( nowInColumn >= inColumn ){
          this._listContainer().appendChild( column );  
          column = null;
          nowInColumn = 0;
        }
          }
      
      if( column ){
        this._listContainer().appendChild( column );  
      }
      
      
      if( tabs.length > 0 ){
        hboxListTypeHidden = false;
      }   
      
      if( tabs.length == 0 ){
        document.getElementById("list_menu2").style.display = "none";
        document.getElementById("list_no_items").style.display = "";        
      }
      else{
        document.getElementById("list_menu2").style.display = "";
        document.getElementById("list_no_items").style.display = "none";
      }
    }  
    
    if( this._displayModeType() == "list" ){
      this._cellsContainer().style.display = "none";
      document.getElementById("fvd_sd_list").style.display = "";
    }
    else if( this._displayModeType() == "thumbs" ){
      this._cellsContainer().style.display = "";
      document.getElementById("fvd_sd_list").style.display = "none";
    }
      
    // set hboxlisttype visibility  
    hboxListType.setAttribute( "hidden", hboxListTypeHidden );
        
    this.adaptFrameSize();      
    
    // restore window scrolling
    if( parent.scrollY != windowScrollY ){
      parent.HtmlSearch.scrollByScript( windowScrollY );      
    } 
    
      
    if( cellContainerScrollLeft > 0 ){
      document.getElementById( "fvd_sd_cells_container" ).scrollLeft = cellContainerScrollLeft;
    }

    },

  removeAllListElements: function(){
    
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                              .getService(Components.interfaces.nsIPromptService);
    var r = promptService.confirm( window, 
               fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "confirm.remove_list_elems.title"),
               fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "confirm.remove_list_elems.text") );
    
    if( !r ){
      return false;
    }
    
    if( this._displayMode() == "recently_closed" ){
      var sStore = Components.classes['@mozilla.org/browser/sessionstore;1'].getService(Components.interfaces.nsISessionStore);
      var countTabs = sStore.getClosedTabCount(this._getMainWindow());
      for( var i = 0; i != countTabs; i++ ){
        try{
          sStore.forgetClosedTab(this._getMainWindow(), 0);
        }
        catch(ex){
          
        }
      }
    }
    else if( this._displayMode() == "most_visited" ){
      var data = this._getMostVisitedTabs( fvd_speed_dial_gFVDSSDSettings.getIntVal("sd.max_most_visited_records"), this._mostVisitedInterval(), this._mostVisitedGroupBy() );
      for( var i = 0; i != data.length; i++ ){
        this.removeMostVisited( data[i].url );
      }
    }
    
    
    this.buildCells();    
  },
  
  clearImageCacheMostVisited: function( url ){
    try{      
      var url = FVDSSDMisc.fileToNativeUri( this._previewFileById( this._md5(url) ) );    
      
      var imgCache = null;
      
      try{
        var tools = Components.classes["@mozilla.org/image/tools;1"].getService(Components.interfaces.imgITools);
        imgCache = tools.getImgCacheForDocument( document );
      }
      catch( ex ){
        imgCache = Components.classes["@mozilla.org/image/cache;1"].getService(Components.interfaces.imgICache);
      }
      
      if( imgCache ){
        try{
              imgCache.removeEntry( url );                  
        }
        catch( ex ){
          
        }
      }
      
    }
    catch(ex){
      //dump( "FAIL CLEAR CACHE " + ex + "\r\n" );
    }

  },
  
  removeMostVisitedThumb: function(aURL){   
    var hash = this._md5( aURL );
    try{
      var file = this._previewFileById( hash );
      file.remove( true );
    }
    catch( ex ){
      
    }
  },
  
  removeMostVisited: function( aURL ){
    this.storage.removeMostVisited( aURL );
    
    this.removeMostVisitedThumb(aURL);
    
    this.buildCells();
  },
  
  removeListElemById: function( id ){
    //this.listElemsRecentlyClosedBypassId.push( id );
    var tabs = this._getRecentClosedTabs();
    var tab;
    // search tab by id
    for( var i = 0; i != tabs.length; i++){
      if( tabs[i].id == id ){
        tab = tabs[i]
        break;
      }
    }

    if( !tab ){
      return false;
    }
      
    var url = tab.url; // remove by url

    
    while( true ){
      var removed = false;
      for( var index = 0; index != tabs.length; index++ ){
        if( tabs[index].url != url ){
          continue;
        }

        
        var sStore = Components.classes['@mozilla.org/browser/sessionstore;1'].getService(Components.interfaces.nsISessionStore);
        sStore.forgetClosedTab(this._getMainWindow(), tabs[index].id);
        removed = true;
        
        break;
      }
      
      if( !removed ){
        break; // all items removed
      }
      
      tabs = this._getRecentClosedTabs();
    }
    
    this.buildCells();
      

  },
  
  openPopupedDial: function( type ){
    type = type || null;

    try{  
      var dial = this.storage.getDialById( this.popupedDial );      
      if( dial ){
        this.clickDial( this.popupedDial );
        this._navigate( dial.url, null, null, type );
      }
    }
    catch( ex ){
      //dump( ex );
    }
  },
  


  editPopupedDial: function(){
    try{
      this.editDial( this.popupedDial );
    }
    catch(ex){

    }
  },  
  
  refreshPopupedDial: function(){
    try{  
      this.updateDialData( this.popupedDial );
    }
    catch( ex ){
      //dump( "ERROR " + ex + "\r\n" );
    }
  },
  
  remodePopupedDial: function(){
    try{  
      this.removeDialWithConfirm( this.popupedDial );
    }
    catch( ex ){
      //dump( "ERROR " + ex + "\r\n" );
    }
  },  
      
  movePopupedDial: function( groupId ){
    try{
      this.moveDial( this.popupedDial, groupId );
    }
    catch( ex ){
      
    }
  },
  
  copyPopupedDial: function(){
    try{  
      var dial = this.storage.getDialById( this.popupedDial );      
      if( dial ){
        this._copyToClipboard( dial.url );
      }
    }
    catch( ex ){
      //dump( "ERROR " + ex + "\r\n" );
    }
  },  
  
  _copyToClipboard: function( str ){
    var gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper);
    gClipboardHelper.copyString(str);
  },
    
    createNewDial: function( url, title, thumb_source_type, thumb_url, eventListeners ){    
        var params = this._displayNewDialWindow( {
      url: url,
      title: title,
      thumb_source_type: thumb_source_type,
      thumb_url: thumb_url,
      group_id: this._getGroupId() != "all" ? this._getGroupId() : null,
      eventListeners: eventListeners
    });
    },

  
  editMostVisitedDial: function( data ){    
    var thumbSrc;
    var hash = this._md5( data.url ); 
    
    var thumb = this._previewUrlById( hash, data.status );  
    
    if( thumb ){
      thumbSrc = thumb;
    }
    
    data.previewUrl = thumb;
    
        var params = this._displayNewDialWindow( data, true, [
      "url",
      "group",
      "autoUpdateState"
    ] );
    
    if( params.ok ){
      this.storage.setMostVisitedModifiedUrlData( data.url, {
        "thumb_url": params.thumb_url,
        "thumb_source_type": params.thumb_source_type,
        "title": params.title,
        "hand_changed": params.hand_changed,
        "use_js": params.use_js,
        "delay": params.delay,
        "disable_plugins": params.disable_plugins
      } );
      
      if( params.needUpdateThumb ){
        this.storage.setMostVisitedModifiedUrlData( data.url, {
          have_preview: 0,
          status: ""
        } );
      } 
      this._refereshMostVisitedThumb( data.url );
      
    }
    },
  
  editMostVisitedDialByData: function( data ){
    data.thumb_url = "";
    data.thumb_source_type = "url";
    data.hand_changed = 0;
        
    var modifiedData = this.storage.getMostVisitedModifiedUrlData( data.url );
    if( modifiedData ){
      for( var k in modifiedData ){
        data[k] = modifiedData[k];
      }
      /*
      data.thumb_url = modifiedData.thumb_url;
      data.thumb_source_type = modifiedData.thumb_source_type;
      data.title = modifiedData.title;
      data.hand_changed = modifiedData.hand_changed;
      data.use_js = modifiedData.use_js;
      data.delay = modifiedData.delay;
      data.disable_plugins = modifiedData.disable_plugins;
      data.status = modifiedData.status;
      */
    }
        
    return fvd_speed_dial_speedDialSSD.editMostVisitedDial( data );   
  },
  
  /* this function called by add dial dialog */
  addDialToStorage: function( params ){
  
    var that = this;
  
    if (params.ok) {
      var denyDetails = {};
      if( this._isDenyUrl(params.url, denyDetails) ){
        var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                        .getService(Components.interfaces.nsIPromptService);
        promptService.alert( null, 
                   fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "alert.sd.dial_exists_blocked.title"),
                   fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "alert.sd.dial_exists_blocked.text." + denyDetails.deny.type) );        

        return false;
      } 
      
      if( this.storage.urlExists( params.url ) ){
        
        if( fvd_speed_dial_gFVDSSDSettings.getBoolVal( "sd.display_url_exists_message" ) ){
          
          var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                          .getService(Components.interfaces.nsIPromptService);
                          
            
        
          var checkValue = {
            value: false
          };
        
          var r = promptService.confirmCheck( null, 
                           fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "confirm.sd.dial_exists.title"),
                           fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "confirm.sd.dial_exists.text"),
                           fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "sd.alert.dont_show_again"),                        
                           checkValue );
          
          if( checkValue.value ){
            fvd_speed_dial_gFVDSSDSettings.setBoolVal( "sd.display_url_exists_message", false );
          }       
          
          
          if( !r ){
            return false;         
          }
          
        }

      }      
    }
    
        
    this._addedDialId = this.storage.add(params.url, params.title, params.thumb_source_type, params.thumb_url,
              params.group, params.use_js, params.hand_changed, params.delay,
              params.disable_plugins, params.update_interval, params.need_sync_screen);
    
    var addedDialId = this._addedDialId;
    
    if( params.thumb_source_type == "local_file" ){
      fvd_speed_dial_Sync.syncDataCond( ["dials", "newDials"], this.storage.dialGlobalId( this._addedDialId ), function( callback ){
        fvd_speed_dial_Storage.asyncGetDialById( addedDialId, ["thumb_src"], function( dial ){
          if( dial.thumb_src ){
            callback( true );
          }
          else{
            callback( false );
          }               
        } );
      } );            
    }
    else{
      fvd_speed_dial_Sync.syncData( ["dials", "newDials"], this.storage.dialGlobalId( this._addedDialId ) );        
    }
      
    
    this.buildCells();
    
    return true;
  },
  
    editDial: function( dialId ){
    try{
      var dial = this.storage.getDialById( dialId );
      
      var thumbSrc;
      var thumb;    
      if( dial.status == "thumb_failed" ){
        thumb = "thumb_failed";
      }
      else{
        thumb = this._previewUrlById( dialId );
      }
          
      if( thumb ){
        thumbSrc = thumb;
      } 
      
      dial.previewUrl = thumbSrc;
      
      if( dial ){
            var params = this._displayNewDialWindow(
          dial, true
        );
        if( this._isDenyUrl(params.url) ){
          var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                          .getService(Components.interfaces.nsIPromptService);
          promptService.alert( window, 
                     fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "alert.sd_url_deny.title"),
                     fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "alert.sd_url_deny.text") );       
  
          return false;
        } 
        
            if (params.ok) {          
          var updateData = {
            "url": params.url,
            "title": params.title,
            "thumb_source_type": params.thumb_source_type,
            "thumb_url": params.thumb_url,
            "group_id": params.group,
            "use_js": params.use_js,
            "hand_changed": params.hand_changed,
            "delay": params.delay,
            "disable_plugins": params.disable_plugins,
            update_interval: params.update_interval,
            manually_cropped: params.manually_cropped,
            need_sync_screen: params.need_sync_screen         
          };          

          // check dial group changed
          if( dial.group_id != params.group ){
            // move dial to new group
            this.moveDial( dialId, params.group );
          }
          
          if( params.needUpdateThumb ){
            updateData.thumb_src = "";
          }             
                    
                this.storage.updateDialData( dialId, updateData );
          this.updateDialData(dialId);
          
          if( params.thumb_source_type == "local_file" ){
            fvd_speed_dial_Sync.syncDataCond( "dials", this.storage.dialGlobalId( dialId ), function( callback ){
              fvd_speed_dial_Storage.asyncGetDialById( dialId, ["thumb_src"], function( dial ){
                if( dial.thumb_src ){
                  callback( true );
                }
                else{
                  callback( false );
                }               
              } );
            } );            
          }
          else{
            fvd_speed_dial_Sync.syncData( "dials", this.storage.dialGlobalId( dialId ) );     
          }
            }       
      } 

    }
    catch(ex){
  
    }
    },
    
  
  adaptFrameSize: function( resizeFrameToMin ){ 
    var groupsBox = document.getElementById("groupsBox");
    //save scrollLeft of groupsBox
    var gbScrollLeft = groupsBox.scrollLeft;    
    

    
    var dialsContent = document.getElementById( "body_dial" ).boxObject;
    
    var frameHeight = dialsContent.height;
    
      

    
    frameHeight += this.ADDITIONAL_FRAME_HEIGHT;
    var minHeight = parent.HtmlSearch.frameSpace();

    
    //dump( frameHeight + " - " + minHeight + "\r\n" );
    
    if( frameHeight < minHeight ){
      frameHeight = minHeight;
    }

        
    window.parent.document.getElementById("speedDialFrame").style.height = frameHeight + "px";    
        
    //window.parent.document.getElementById("speedDialFrame").style.width = frameWidth + "px";
    
    var frameWidth;
    if( this.getInRowCount() == "auto" ){
      frameWidth = window.parent.document.body.clientWidth;
    }
    else{
      var container = this._currentContainer().boxObject;
      frameWidth = Math.max( container.width, window.parent.document.body.clientWidth );      
    }   

        
    //frameWidth -= 20;
    
    window.parent.document.getElementById("speedDialTop").style.width = frameWidth + "px";
    window.parent.document.getElementById("speedDialFrame").style.width = frameWidth + "px";
    
    //restore scroll left of groups box
    groupsBox.scrollLeft = gbScrollLeft;    
    


  },
  
  getInRowCount: function(){
    var count = "auto";
    try{
      count = fvd_speed_dial_gFVDSSDSettings.getStringVal( "sd."+this._displayMode()+"_columns" );
    }
    catch( ex ){

    }
    
    return count;
  },
  
  setInRowCount: function( v ){
    fvd_speed_dial_gFVDSSDSettings.setStringVal( "sd."+this._displayMode()+"_columns", v );
  },
  
  customSize: function(){
    
    var size = null;
    
    var displayMode = this._displayMode();
    
    if( displayMode == "top_sites" ){
      size = fvd_speed_dial_gFVDSSDSettings.getIntVal("sd.custom_dial_width");
    }
    else if( displayMode == "most_visited" ){
      size = fvd_speed_dial_gFVDSSDSettings.getIntVal("sd.custom_dial_width_mostvisited");        
    }
      
    return {
            width: size,
            height: Math.round( size/this.CELLS_RATIO )
        }       
  },
  
  scrollingMode: function(){
    return fvd_speed_dial_gFVDSSDSettings.getStringVal( "scrolling" );
  },
  
  setScrollingMode: function( mode ){
    
    fvd_speed_dial_gFVDSSDSettings.setStringVal( "scrolling", mode );
    
  },  
  
  actualScrollingMode: function(){
    // depends on current display mode and thumbs type
    
    if( this._thumnailsMode() == "list" ){
      return "vertical";
    }
    else{
      return this.scrollingMode();
    }
    
    /*
    if( this._displayMode() == "top_sites" ){
            
    }
    else if( this._displayMode() == "recently_closed" ){

    } 
    else if( this._displayMode() == "most_visited" ){

    }*/   
    
  },
  
  refreshScrollMode: function(){
    
    if( typeof this.__horizScrollListener == "undefined" ){
      this.__horizScrollListener = function( event ){
                
        cellsContainer.scrollLeft += event.deltaY * fvd_speed_dial_speedDialSSD.HORIZONTAL_SCROLL_SPEED;
        
      }
    }
      
    var mode = this.scrollingMode();
    
    var sdContent = document.getElementById( "speedDialContent" );
    var cellsContainer = document.getElementById( "fvd_sd_cells_container" );
    
    sdContent.setAttribute( "scrolling_mode", mode );
    parent.document.body.setAttribute( "scrolling_mode", mode );
    
    try{
      cellsContainer.removeEventListener( "wheel", this.__horizScrollListener );      
    }
    catch( ex ){
      
    }
    
    if( mode == "horizontal" ){ 
      cellsContainer.addEventListener( "wheel", this.__horizScrollListener, false );    
    }
    
  },
  
  adaptCellsSize: function( totalCells ){   
    var scrollingMode = this.scrollingMode();
    
    //dump( "SCROLLING: " + scrollingMode + ": "+totalCells+"\n" );
  
    var wWidth = window.parent.document.body.clientWidth;
  
    var userDefinedInRow = this.getInRowCount();
  
    if( this._displayModeType() == "list" ){
      // no need to adapt cells size for list only calc optimal in row
      this.optimalInRow = Math.floor( wWidth/(this.LIST_ELEM_WIDTH + this.LIST_COLUMNS_MARGIN) );
      
      if( userDefinedInRow == "auto" ){
        this.inRow = this.optimalInRow;
      }
      else{
        // check need fix user defined value, if larger that optimal
        if( userDefinedInRow > this.optimalInRow ){
          userDefinedInRow = this.optimalInRow;         
          this.setInRowCount( userDefinedInRow );
        }       
        
        this.inRow = userDefinedInRow;
      }
      
      if( this.inRow > this.optimalInRow ){
        this.inRow = this.optimalInRow;
      }
      
      return;
    }
  
    totalCells++; // plus cell count
        
    var mode = this._thumnailsMode();
  
    // cellSize*cellSize*countCells = window.width * window.height
    
    var wHeight = window.innerHeight - this.SEARCHBAR_HEIGHT; 
    var wHeightPerspective = parent.window.innerHeight;
    var maginsSize = 0;
    // remove margins from size
    
    //var size = Math.ceil( Math.sqrt( (wWidth) * (wHeight) / totalCells ) );
    
    if( mode == "small" ){
      size = this.SMALL_CELL_SIZE;
      maginsSize = this.SMALL_MARGINS_SIZE;
    }
    else if( mode == "big" ){
      size = this.BIG_CELL_SIZE;
      maginsSize = this.BIG_MARGINS_SIZE;
    }
    else if( mode == "medium" ){
      size = this.MEDIUM_CELL_SIZE;
      maginsSize = this.MEDIUM_MARGINS_SIZE;
    }
    else if( mode == "custom" ){    
      
      var displayMode = this._displayMode();
      
      if( displayMode == "top_sites" ){
        size = fvd_speed_dial_gFVDSSDSettings.getIntVal("sd.custom_dial_width");
      }
      else if( displayMode == "most_visited" ){
        size = fvd_speed_dial_gFVDSSDSettings.getIntVal("sd.custom_dial_width_mostvisited");        
      }
      
      
      maginsSize = this.CUSTOM_MARGINS_SIZE;
        
    }
    
    this.cellMargin = maginsSize;

    var cols = Math.ceil(wWidth / size);
    var rows = Math.ceil(wHeight / size);
    
    wWidth -= 2 * cols * maginsSize;
    wHeight -= 2 * rows * maginsSize;
    
    while( cols > 1 && cols * size > wWidth ){
      cols--;
    } 
    
    var optimalInCol = null;
    var optimalInRow = cols;
    
    if( scrollingMode == "horizontal" ){ 
      
      // need to check if dials overflow by vertical their container, use horizontal scroll, if not use vertical(no scroll, but dials positioned from left ro right
      // not in center)
      
      var dialHeight = size / this.CELLS_RATIO;
      
      //if( this._getShowUrlInDial() ){
        dialHeight += 30;
      //}
  
      //if( this._showIconsAndTitles() ){
        dialHeight += 18;
      //} 
      
      wHeightPerspective -= document.getElementById("speedDialPayload").boxObject.y;
            
      optimalInCol = Math.floor(wHeightPerspective / dialHeight); 
      
      do{
        
        var dialsEffectiveHeightSpace = wHeightPerspective - 2 * optimalInCol * maginsSize;
        
        if( optimalInCol == 1 ){
          break;
        }
        
        if( optimalInCol * dialHeight > dialsEffectiveHeightSpace ){
          optimalInCol--;
        }
        else{
          break;
        }
        
      }
      while( true );
      
      if( userDefinedInRow == "auto" ){ // if numbers of rows != auto, they must be fixed and use horizontal scroll everyway
                
        // check vertical overflow
        var rows = Math.ceil( totalCells / cols );  
        
        if( rows * dialHeight <= wHeightPerspective ){
          dump( "rows: " + rows + ", dial height: "+dialHeight+", height: " + rows * dialHeight + "("+wHeightPerspective+")\n" );
          
          scrollingMode = "vertical"; // force scrolling mode vertical if dials page not overflowed
        }
        
      }
              
    }   
    
    if( scrollingMode == "vertical" ){  

    }
    else if( scrollingMode == "horizontal" ){       
      
      var resizeContainerTo = wHeightPerspective - 3;
      
      if( userDefinedInRow != "auto" ){
        rows = userDefinedInRow;
      }     
      else{
        rows = optimalInCol;        
      }
  
      do{
        
        var dialsEffectiveHeightSpace = wHeightPerspective - 2 * rows * maginsSize;
        
        if( rows == 1 ){
          break;
        }
        
        if( rows * dialHeight > dialsEffectiveHeightSpace ){
          rows--;
        }
        else{
          break;
        }
        
      }
      while( true );
        
      document.getElementById("fvd_sd_cells_container").style.height = resizeContainerTo + "px";
      
      cols = Math.ceil(totalCells / rows);
    }
      
    if( userDefinedInRow != "auto" ){
      // check for user defined value is less or equal that optimal value
      // if larger fix it value to optimal
      var needFix = false;
      if( scrollingMode == "horizontal" ){
        if( userDefinedInRow > optimalInCol ){
          userDefinedInRow = optimalInCol;
          needFix = true;
        }
      }
      else if( scrollingMode == "vertical" ){
        if( userDefinedInRow > optimalInRow ){
          userDefinedInRow = optimalInRow;          
          needFix = true;
        } 
      }     
            
      if( needFix ){        
        //this.setInRowCount( userDefinedInRow );
      } 
    } 
          
    if( userDefinedInRow == "auto" || scrollingMode == "horizontal" ){
      this.inRow = cols;
    }
    else{
      this.inRow = userDefinedInRow;
    }
    
    this.optimalInRow = optimalInRow;
    this.optimalInCol = optimalInCol;
    
    
      
    this.cellSize = {
            width: size,
            height: size/this.CELLS_RATIO
        }   
  },
  
  setMoveArrows: function( type, event ){

    parent.HtmlSearch.setMoveArrows( type, event );   

  },
  
  getMoveType: function(  ){
    
    return parent.HtmlSearch.getMoveType();   

  },
  
  endDrag: function( event ){
    
    document.getElementById( "speedDialContent" ).setAttribute( "state", "normal" );

    fvd_speed_dial_speedDialSSD.setMoveArrows( "none", event );
    
  },
  
  startDrag: function( event ){
    document.getElementById( "speedDialContent" ).setAttribute( "state", "dragging" );
    
    var cell = event.currentTarget;
    
    var image = new Image();
    var dialId = cell.getAttribute("id").replace("cell_", "");
    
    
    var dt = event.dataTransfer;  
    dt.setData(fvd_speed_dial_speedDialSSD.DND_DIALS_TYPE, dialId);         
    dt.setData("text/plain", fvd_speed_dial_speedDialSSD.storage.getDialById( dialId ).url);      
    dt.setDragImage(cell, 0, 0);  
    dt.mozCursor = "default"; 
  },
  
  overDrag: function( event ){
    
    var cell = event.currentTarget;
    
    var draggingId = event.dataTransfer.getData( fvd_speed_dial_speedDialSSD.DND_DIALS_TYPE );
    
    if( cell && cell.getAttribute("drag_over") != "1" /*&& cell.id != "cell_"+draggingId*/ ){
      
      cell.setAttribute( "drag_over", "1" );
    } 
    
    //event.preventDefault();
    //event.stopPropagation();
    event.preventDefault()
    
    return false;
  },
  
  outDrag: function( event ){
    
    var cell = event.currentTarget;
    if( cell ){     
      cell.setAttribute( "drag_over", "0" );
    } 
    
    //event.stopPropagation();
    event.preventDefault();
    
    // timeout for compatibility with firefox 3.
    // it fires event dragout before drop. 
    setTimeout( function(){
      fvd_speed_dial_speedDialSSD.setMoveArrows( "none", event );       
    }, 0 );

    
    return true;
  },
  

  dropDrag: function( event ){    
    event.stopPropagation();
    event.preventDefault();
    
    var cell = event.currentTarget;
    var id = cell.getAttribute("id").replace("cell_","");
    
    var dragType = "none";
    
    if( this._displayModeType() == "list" ){
      if( cell.hasAttribute("to_insert_before") ){
        dragType = "to_insert_before";
      }
      else if( cell.hasAttribute("to_insert_after") ){
        dragType = "to_insert_after";
      }
    }
    else{
      dragType = this.getMoveType();
    }
    
    
    if( cell ){
      cell.setAttribute( "drag_over", "0" );
    }     
    
    if( dragType != "none" ){
      var fromId = event.dataTransfer.getData( fvd_speed_dial_speedDialSSD.DND_DIALS_TYPE );
      var toId = id;
      
      var insertPos = null;
      if( dragType == "to_replace" ){
        insertPos = "swap";
      }
      else if( dragType == "to_insert_before" ){
        insertPos = "before";
      }
      else if( dragType == "to_insert_after" ){
        insertPos = "after";
      }
      
      
      
      if( insertPos == "swap" ){
        this.swapDials( fromId, toId ); 
      }
      else{
        this.insertDial( fromId, toId, insertPos );     
      }
    }
    
    this.setMoveArrows( "none", event );

  },
  
  refreshListType: function(){
  
    document.getElementById("list_type").value = this._getListType();
    
  },
  
  refreshThumbsLinks: function(){ 
    
  },
  
  restorePreviousSession: function(){
    try{
      Components.classes['@mozilla.org/browser/sessionstore;1'].getService(Components.interfaces.nsISessionStore).restoreLastSession(); 
      this.refreshRestoreSessionButton();   
      this.refreshGroupsList();
      this.refreshCurrentGroup();
    }
    catch( ex ){

    }
  },
  
  
  canRestorePreviousSession: function(){
    
    var can = fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.display_restore_previous_session");
    
    if( !Components.classes['@mozilla.org/browser/sessionstore;1']
       .getService(Components.interfaces.nsISessionStore)
       .canRestoreLastSession ){
      
      can = false;
      
    } 
    
    return can;
    
  },  
  
  refreshRestoreSessionButton: function(){
    //var restoreSessionButton = this.parentDocument.getElementById( "buttonRestoreSession" );
    
    var restoreSessionButton = document.getElementById( "restoreSessionContainer" );
    
    var hidden = !this.canRestorePreviousSession();
    
    restoreSessionButton.setAttribute( "hidden", hidden );
  },
  
  refreshDisplayType: function(){   
    var topSitesTitle = fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.selector.top_sites" );
    var recentlyClosedTitle = fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.selector.recently_closed" );
    var mostVisitedTitle = fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.selector.most_visited" );
    
    topSitesTitle = topSitesTitle.replace( "{COUNT}", this.storage.count() );
    var count = this._getRecentClosedTabs( fvd_speed_dial_gFVDSSDSettings.getIntVal("sd.max_recently_closed_records") ).length;
    recentlyClosedTitle = recentlyClosedTitle.replace( "{COUNT}", count );
        
    count = this._getMostVisitedTabs( fvd_speed_dial_gFVDSSDSettings.getIntVal("sd.max_most_visited_records"), this._mostVisitedInterval(), this._mostVisitedGroupBy() ).length;
    mostVisitedTitle = mostVisitedTitle.replace( "{COUNT}", count );
    
    
    var speedDialButton = this.parentDocument.getElementById( "buttonSpeedDial" );
    var mostVisitedButton = this.parentDocument.getElementById( "buttonMostVisited" );
    var recentlyClosedButton = this.parentDocument.getElementById( "buttonRecentlyClosed" );
    
  
    speedDialButton.setAttribute( "disabled", (!this.enableTopSites) ? "1" : "0" );
    recentlyClosedButton.setAttribute( "disabled", (!this.enableRecentlyClosed) ? "1" : "0" );
    mostVisitedButton.setAttribute( "disabled", (!this.enableMostVisited) ? "1" : "0"  );
       
    var speedDialTitleElem = speedDialButton.getElementsByClassName("subText")[0];
    var mostVisitedTitleElem = mostVisitedButton.getElementsByClassName("subText")[0];
    var recentlyClosedTitleElem = recentlyClosedButton.getElementsByClassName("subText")[0];
    
    speedDialButton.setAttribute( "active", "0" );
    mostVisitedButton.setAttribute( "active", "0" );
    recentlyClosedButton.setAttribute( "active", "0" );
    
    var hint = parent.document.getElementById( "cursorScrollTopHint" );
    
    if(this._displayMode() == "top_sites"){
      speedDialButton.setAttribute( "active", "1" );
      hint.textContent = topSitesTitle;
    }
    else if(this._displayMode() == "recently_closed"){
      recentlyClosedButton.setAttribute( "active", "1" );
      hint.textContent = recentlyClosedTitle;     
    }
    else if(this._displayMode() == "most_visited"){
      mostVisitedButton.setAttribute( "active", "1" );
      hint.textContent = mostVisitedTitle;
    }   
    
    speedDialTitleElem.textContent = topSitesTitle;
    mostVisitedTitleElem.textContent = mostVisitedTitle;
    recentlyClosedTitleElem.textContent = recentlyClosedTitle;
        
        
    document.getElementById("groupsBoxParent").setAttribute( "hidden", this._displayMode() != "top_sites" );
    document.getElementById("mostVisitedTypes").setAttribute( "hidden", this._displayMode() != "most_visited" );
    
    // setup context menu   
    this.setupFsContextMenu();
    
    var bodyDial = document.getElementById( "speedDialContent" );
    bodyDial.setAttribute( "contenttype", this._displayMode() );
    
    setTimeout( function(){
      parent.HtmlSearch.setupHotKeysTitles();     
    }, 0 );
  },
  
  setupFsContextMenu: function(){
    var bodyDial = document.getElementById( "speedDialContent" );
    
    var menuId = "fs_menu_" + this._displayMode();
    
    bodyDial.setAttribute( "context", menuId );
    
    var menu = document.getElementById(menuId);
    
    //setup thumbs type
    var menuItem = menu.getElementsByClassName("view_"  + this._thumnailsMode())[0];
    menuItem.setAttribute("checked", "true");
        
    var customItem = menu.getElementsByClassName("view_custom")[0];
    
    if( customItem ){
      
      var size = this.customSize();
      customItem.setAttribute( "label", customItem.getAttribute("label_template") + " ("+size.width+"x"+size.height+")" );
      
    }
  },
  
  setListType: function( type ){
    fvd_speed_dial_gFVDSSDSettings.setStringVal( "sd.list_type", type );
  },
  
  setThumbsType: function( type ){    
  
    if( type == "custom" && !fvd_speed_dial_gFVDSSDSettings.getBoolVal( "i_know_about_custom_dials_size" ) ){
      fvd_speed_dial_gFVDSSDSettings.displayWindow( null, "paneSdGlobal", function( document ){
        document.getElementById("globalTabs").selectedIndex = 1;        
      } );
      fvd_speed_dial_gFVDSSDSettings.setBoolVal( "i_know_about_custom_dials_size", true )
    }
  
    if( this._displayMode() == "top_sites" ){
      this.top_sites_mode = type;
      fvd_speed_dial_gFVDSSDSettings.setStringVal("sd.thumbs_type", type);      
    }
    else if( this._displayMode() == "most_visited" ){
      this.most_visited_mode = type;
      fvd_speed_dial_gFVDSSDSettings.setStringVal("sd.thumbs_type_most_visited", type);     
    }
    else if( this._displayMode() == "recently_closed" ){
      this.recently_closed_mode = type;
      fvd_speed_dial_gFVDSSDSettings.setStringVal("sd.thumbs_type_recently_closed", type);    
    }

  },
  
  
  _setDisplayType: function( type ){
    this.displayMode = type;
    fvd_speed_dial_gFVDSSDSettings.setStringVal("sd.display_type_last_selected", type);
    
    this.refreshShowHideButton();
  },
  
  setDisplayType: function( type ){   
    this._setDisplayType(type);
    this.refreshThumbsLinks();
    
    this.buildCells();
  },

  refreshSearchBarExpanding: function(){    
    
  },
  
  toggleSearchBarExpand: function(){
    fvd_speed_dial_gFVDSSDSettings.setBoolVal( "sd.search_bar_expanded", !this._searchBarExpanded() );
  },
  
  refreshShowHideButton: function(){
      
    var showHideButton = this.parentDocument.querySelector( "#searchBar .buttonsRightPanel .buttonShowHide" );
    showHideButton.setAttribute( "active", this.expandState() ? "1" : "0" );
    
  },
  
  refreshExpands: function(){
    
    var that = this;
    
    var topSitesButton = this.parentDocument.getElementById( "buttonSpeedDial" );   
    var mostVisitedButton = this.parentDocument.getElementById( "buttonMostVisited" );  
    var recentlyClosedButton = this.parentDocument.getElementById( "buttonRecentlyClosed" );    
    
    
    topSitesButton.setAttribute( "expanded", this.topSitesExpanded ? "1" : "0" );
    mostVisitedButton.setAttribute( "expanded", this.mostVisitedExpanded ? "1" : "0" );
    recentlyClosedButton.setAttribute( "expanded", this.recentlyClosedExpanded ? "1" : "0" );
    
    this.refreshShowHideButton();
        
  },
  
  openAllLinks: function(){
    var data = [];
    var clickOnDials = false;
    if( this._displayMode() == "top_sites" ){
      data = this.storage.listDials( false, this._getGroupId(), this._getGroupId() == "all" ? fvd_speed_dial_gFVDSSDSettings.getIntVal( "sd.all_groups_limit_dials" ) : null );
      clickOnDials = true;
    }
    else if( this._displayMode() == "most_visited" ){
      data = this._getMostVisitedTabs( fvd_speed_dial_gFVDSSDSettings.getIntVal("sd.max_most_visited_records"), this._mostVisitedInterval(), this._mostVisitedGroupBy() );
    }
    else if( this._displayMode() == "recently_closed" ){
      data = this._getRecentClosedTabs( fvd_speed_dial_gFVDSSDSettings.getIntVal("sd.max_recently_closed_records") );
    }
    
    for( var i = 0; i != data.length; i++ ){
      this._navigate( data[i].url, null, null, "new_tab_passive" );
      this.clickDial( data[i].id );
    } 
  },
  
  refreshAllDials: function(){
    if( this._displayMode() == "top_sites" ){
      var dials = this.storage.listDials(
        false,
        this._getGroupId(),
        this._getGroupId() == "all" ? fvd_speed_dial_gFVDSSDSettings.getIntVal( "sd.all_groups_limit_dials" ) : null
      );
      for( var i = 0; i != dials.length; i++ ){
        this.updateDialData( dials[i].id );
      }
    }
    else if( this._displayMode() == "most_visited" ){
      var data = this._getMostVisitedTabs( fvd_speed_dial_gFVDSSDSettings.getIntVal("sd.max_most_visited_records"), this._mostVisitedInterval(), this._mostVisitedGroupBy() );
      for( var i = 0; i != data.length; i++ ){
        var grabData = this.storage.getMostVisitedModifiedUrlData( data[i].url );
        if( grabData ){         
          data[i] = FVDSSDMisc.extendObject( data[i], grabData );         
        }
        this._grabMostVisitedThumb( data[i].url, data[i] );
      }
    }
    else if( this._displayMode() == "recently_closed" ){
      var tabsData = this._getRecentClosedTabs( fvd_speed_dial_gFVDSSDSettings.getIntVal("sd.max_recently_closed_records") );
      for( var i = 0; i != tabsData.length; i++ ){
        var elem = document.getElementById( "list_elem_"+tabsData[i].id );
        if( !elem ){
          continue;
        }
        elem.setAttribute( "loading", 1 );
        var checker = new fvd_speed_dial_SpeedDialUrlChecker(function( status ){
          var elem = this.elem;
          if( status == 200 ){
            elem.setAttribute( "error", 0 );                      
          }
          else{
            elem.setAttribute( "error", 1 );                      
          } 
          elem.setAttribute( "loading", 0 );          
        }, tabsData[i].url);
        checker.elem = elem;
        checker.execute();
      }
    }
  },
  
  
  dontHookAboutBlank: function(){
    try
    {
      fvd_speed_dial_gFVDSSDSettings.setBoolVal( 'toolbar.hook.about_blank', false );
      //var registry = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getBranch(SETTINGS_KEY_BRANCH);
      //registry.setBoolPref();
      parent.window.location.replace('about:blank');
    } catch (e) {

    }
  },
  
  _menu2GetPopupedData: function(){
    var data = null;
    if( this._displayMode() == "most_visited" ){
      data = this.popupedMostVisitedElem;
    } 
    else if( this._displayMode() == "recently_closed" ){
      data = this.popupedListElem;
    } 
    
    return data;
  },
  
  addPopupedListElem: function(){
    var data = this._menu2GetPopupedData();
    if( !data ){
      return false;
    }
  
    fvd_speed_dial_speedDialSSD.createNewDial( data.url, data.title, data.thumb_source_type, data.thumb_url );
    
  },
  
  refreshPopupedListElem: function(){
    var data = this._menu2GetPopupedData();
    if( !data ){
      return false;
    }
    
    if( this._displayMode() == "most_visited" ){        
      this._refereshMostVisitedThumb( data.url );
    }
  },
  
  editPopupedListElem: function(){
    var data = this._menu2GetPopupedData();
    if( !data ){
      return false;
    } 

    fvd_speed_dial_speedDialSSD.editMostVisitedDialByData( data );
  },
  
  openPopupedListElem: function( type ){
    var data = this._menu2GetPopupedData();
    if( !data ){
      return false;
    }
    if( data ){
      
      type = type || null;
  
      try{    
        this._navigate( data.url, null, null, type );
      }
      catch( ex ){
        //dump( ex );
      }
    }
  },
  
  removePopupedListElem: function(){
    if( this._displayMode() == "recently_closed" ){
      if( !this.popupedListElem ){
        return false;
      } 
      
      fvd_speed_dial_speedDialSSD.removeListElemById( this.popupedListElem.id );  
    }
    else{
      if( !this.popupedMostVisitedElem ){
        return false;
      } 
      fvd_speed_dial_speedDialSSD.removeMostVisited( this.popupedMostVisitedElem.url );
    } 
  },
  

  
  blockPopupedListElem: function(){
    var data = this._menu2GetPopupedData();
    if( !data ){
      return false;
    } 
    
    fvd_speed_dial_speedDialSSD.denyUrl( data.url );
  },
  
  copyPopupedListElem: function(){
    var data = this._menu2GetPopupedData();
    if( !data ){
      return false;
    } 
    
    fvd_speed_dial_speedDialSSD._copyToClipboard( data.url );
  },
  
  _tabSelectListener: function( tab ){
    var browser = gBrowser.selectedBrowser;
          
    if( browser.contentWindow == window.parent ){
      // user selects again this speed dial tab, need to rebuld cells
      fvd_speed_dial_speedDialSSD.sheduleFullRebuild();
    }   
    
    parent.HtmlSearch.tabSelect(tab);

  },
  
  _adjustCursorScrollTopHintPosition: function( x, y ){
    var hint = parent.document.getElementById( "cursorScrollTopHint" );
    if( hint.getAttribute("active") == "0" ){
      hint.setAttribute("active", "1");
    }     
    
    var left = x;
    var top = y + window.parent.HtmlSearch.frame().offsetTop - hint.offsetHeight;
        
    if( top + hint.offsetHeight <= parent.innerHeight ){
      hint.style.top = top + "px";
    }
    
    if( left + hint.offsetWidth <= parent.innerWidth ){
      hint.style.left = left + "px";
    }
      
    
  },
  
  _hideCursorScrollTopHint: function(){
    var hint = parent.document.getElementById( "cursorScrollTopHint" );
    if( hint.getAttribute("active") == "1" ){
      hint.setAttribute("active", "0");
    }
  },
  
  _mouseMoveListener: function( event ){
    if(fvd_speed_dial_speedDialSSD.mouseDown){                
      var dif = (event.pageX - fvd_speed_dial_speedDialSSD.mouseDownPos.x);

      if( Math.abs(dif) > fvd_speed_dial_speedDialSSD.pixelsToSlideMode ){
        fvd_speed_dial_speedDialSSD.cirlceDisplayMode( dif > 0 ? 1 : -1 );
        fvd_speed_dial_speedDialSSD.mouseDownPos = {
          x: event.pageX,
          y: event.pageY
        };
      }
      
      for( var k in event ){
        if( typeof event[k] == "function" ){
          continue;
        }

      }
      
      fvd_speed_dial_speedDialSSD._adjustCursorScrollTopHintPosition( event.pageX, event.pageY );
    }

  },
  
  _mouseDownListener: function( event ){
    if( event.button == 0 ){
      
      if( ["xul:thumb", "xul:slider", "resizer"].indexOf( event.originalTarget.tagName ) != -1 ){
        return;
      }
      
      fvd_speed_dial_speedDialSSD.mouseDownPos = {
        x: event.pageX,
        y: event.pageY
      };
      
      fvd_speed_dial_speedDialSSD.mouseDown = true; 
    }   
  },
  
  _mouseUpListener: function( event ){
    fvd_speed_dial_speedDialSSD.mouseDown = false;
    var groupsBox = document.getElementById( "groupsBox" );
    groupsBox.setAttribute( "mousedown", "0" ); 
    fvd_speed_dial_speedDialSSD._hideCursorScrollTopHint();
  },
  
  _tabCloseListener: function( event ){   
    if( fvd_speed_dial_speedDialSSD._displayMode() == "recently_closed" ){
      // if mode is recetly_close - rebuild list
      fvd_speed_dial_speedDialSSD.buildCells();
    }   
  },
  
  expandState: function( type ){
    type = type || this._displayMode(); 
    
    var oldValue = null;
    switch( type ){
      case "top_sites":
        oldValue = this.topSitesExpanded;
      break;
      case "recently_closed":
        oldValue = this.recentlyClosedExpanded;
      break;
      case "most_visited":
        oldValue = this.mostVisitedExpanded;
      break;
    }
    
    return oldValue;
  },
  
  toggleExpand: function( type ){
    
    if( PowerOff.isHidden() ){
      return;
    }
    
    type = type || this._displayMode(); 
    
    var oldValue = this.expandState( type );
      
    if( oldValue === null ){
      return false;
    }
    
    fvd_speed_dial_gFVDSSDSettings.setBoolVal( "sd."+type+"_expanded", !oldValue );
  
  },

  openAdditionalGroupsMenu: function( event ){
    
    if( event.button != 0 ){
      return;
    }
    
    var menu = document.getElementById("additional_groups_list");
    var button = document.getElementById("groupsBox").getElementsByClassName("slider")[0];    
    
    menu.openPopup( button, "overlap", 0, 0, false, false, null );
    
  },
  
  groupsBoxMouseDown: function( event ){
    if (event.button != 0) {
      return true;
    }
    
    var groupsBox = document.getElementById( "groupsBox" );
    groupsBox.setAttribute( "mousedown", "1" ); 
    groupsBox.setAttribute( "mousex", event.pageX );
    
    event.stopPropagation();  
  },

  
  groupsBoxMouseMove: function(event){
    var groupsBox = document.getElementById( "groupsBox" );
    if( groupsBox.getAttribute( "mousedown" ) == "1" ){
      var offset = groupsBox.getAttribute( "mousex") - event.pageX;;

      groupsBox.scrollLeft += offset;
      
      groupsBox.setAttribute( "mousex", event.pageX );
    }
  },
  
  hideAllContextMenus: function(){
    var menus = document.getElementsByTagName( "menupopup" );
    //dump( "Close menus " + menus.length + "\r\n" );
    for( var i = 0; i != menus.length; i++ ){
      var menu = menus[i];
      if( menu.state == "open" ){
        menu.hidePopup();
      }
    }
  },
  
  setupBgAdjuster: function(){
    this.backgroundAdjuster = new FVDSDSSDBackgroundAdjuster();   
    
    this.backgroundAdjuster.elem = parent.document.documentElement;//document.getElementsByTagName("window")[0];//document.documentElement;//getElementById( "speedDialContent" );
    this.refreshBg();
  },
  
  RateMessage: {
    displayIfNeed: function(){
      
      var that = this;
      
      try{
        if( fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.dont_display_rate_message") ){
          return;
        }     
      }
      catch( ex ){
        
      }
      
      const SECONDS_USAGE_FOR_RATE_MESSAGE = 24 * 3600 * 1; // 1 days
      
      AddonManager.getAddonByID( fvd_speed_dial_gFVDSSD.selfId(), function(addon){
        
        try{
          var now = Math.round(new Date().getTime())/1000;
          var installTime = Math.round(addon.installDate.getTime()/1000);
          
          if( now - installTime >= SECONDS_USAGE_FOR_RATE_MESSAGE ){
            that.display();
          }
        }
        catch( ex ){
          
        }

        
      } );
      
    },
    
    display: function(){
      var toElem = parent.document.getElementById( "searchBar" );       
      parent.HtmlSearch.showOptions( "rateMessage", toElem, null, "right", true );
    }
  },  
  
  HasSyncUpdatesMessage: {
    
    display: function(){
      return; // not in use
      
      var toElem = parent.document.getElementById( "searchBar" );       
      parent.HtmlSearch.showOptions( "hasSyncUpdatesMessage", toElem, null, "right", true );
      
      var updateTime = parent.document.getElementById( "hasSyncUpdatesMessage" ).getElementsByClassName( "updateTime" )[0];
      var updateInfo = fvd_speed_dial_Sync.getLastUpdateInfo();
      
      var lastUpdateTime = Math.max( updateInfo.lastUpdateTimeDials, updateInfo.lastUpdateTimeGroups );
      
      updateTime.textContent = new Date(lastUpdateTime).toLocaleString();
    },
    
    skipSync: function(){
      fvd_speed_dial_Sync.skipLastUpdate();     
    },
    
    sync: function(){
      fvd_speed_dial_Sync.openSyncProgressDialog( window, "applyServerUpdates" ); 
    },
    
    manualSync: function(){     
      
      if( !fvd_speed_dial_Sync.fvdSynchronizerAvailable() ){
        
        openDialog('chrome://fvd.speeddial/content/dialogs/fvd_sd_install_fvd_sync.xul', '', 'chrome,titlebar,toolbar,centerscreen,dialog=yes');
        
        return;
        
      }
      
      if( fvd_speed_dial_Sync.getState() == "none" ){
        //fvd_speed_dial_gFVDSSDSettings.displayWindow( null, "paneSdSync" );
        fvd_speed_dial_Sync.openSettings( "syncTabs_account" );
      }
      else{
        fvd_speed_dial_Sync.openSyncProgressDialog( window, "uploadUpdatesAndCheckForUpdates" );
        parent.HtmlSearch.hideOptions();        
      }
      
    },
    
    displaySyncButton: function(){
      parent.document.getElementById( "buttonSync" ).removeAttribute( "hidden" );
    },
    
    hideSyncButton: function(){
      parent.document.getElementById( "buttonSync" ).setAttribute( "hidden", true );
    },
    
    refreshSyncButtonActivity: function(){
      
      var active = false;
      var state = fvd_speed_dial_Sync.getState();
      
      if( state == "has_update" ){
        active = true;      
      }
      if( fvd_speed_dial_Sync.hasToSyncData() ){
        active = true;      
      }
      
      var syncButton = parent.document.getElementById( "buttonSync" );
      
      syncButton.setAttribute( "active", active ? "1" : "0" );      
      
      syncButton.setAttribute( "sync", state == "syncing" ? 1 : 0 );

    },
    
    refreshSyncButtonVisibility: function(){
      
      var hide = false;
      
      // dont hide sync button in fast menu if sync account is not logged, we have to inform user about sync feature
      if( !fvd_speed_dial_Sync.isActive() /*|| fvd_speed_dial_Sync.getState() == "none"*/ ){
        hide = true;    
      }
      
      if( !fvd_speed_dial_Sync.fvdSynchronizerAvailable() ){
        hide = false;
      }

      if( hide ){
        this.hideSyncButton();
      }   
      else{
        this.displaySyncButton();       
      }   

    }           
    
  },
  
  sheduleFullRebuild: function(){
    this._needFullRebuild = true;
  },
  
  sheduleRebuildCells: function(){
    this._needRebuildCells = true;
  },
    
  display: function(){
    
    // FF 3 compat
    if( parent ){
      if( parent.wrappedJSObject ){
        parent = parent.wrappedJSObject;
      } 
    }
      
    try{
      this._display();
    }
    catch( ex ){
      dump( ex.stack + "\n" );
    }
    
  },
      
  _display: function(){ 
      
    var that = this;    
      
    if( fvd_speed_dial_Misc.isLangInList("ru") ){
      // setup search button as search in yandex
      document.querySelector("#searchButton label").setAttribute( "value", 
        fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.search_on_yandex") );
    } 
        
    fvd_speed_dial_Themes.setForDocument( document, fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.active_theme") );
    
    setInterval( function(){
      if( that._needFullRebuild ){
        
        fvd_speed_dial_Storage._flushCache();
        
        that._needFullRebuild = false;
        that._needRebuildCells = false;
        that.buildCells();    
        that.refreshGroupsList();
        that.refreshCurrentGroup();

      }
      
      if( that._needRebuildCells ){
        that.buildCells();    
        that._needRebuildCells = false;
      }
      
    } , 100 );
    
    // global vars
    
    var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                       .getInterface(Components.interfaces.nsIWebNavigation)
                       .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                       .rootTreeItem
                       .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                       .getInterface(Components.interfaces.nsIDOMWindow); 
    
    fvd_speed_dial_gFVDSSD = mainWindow.fvd_speed_dial_fvdSSD;  
    
    if( typeof gBrowser == "undefined" ){
      // set global gBrowser var
      gBrowser = mainWindow.gBrowser;     
    }
        
    this.id = fvd_speed_dial_gFVDSSD.getDialId();
    
    this.parentDocument = parent.document;
    parent.speedDial = this;
    parent.frameWin = window;   
    
      
    
    window.parent.addEventListener( "resize", function(){
      
      fvd_speed_dial_speedDialSSD.sheduleFullRebuild();
      
      //fvd_speed_dial_speedDialSSD.buildCells();   
      //fvd_speed_dial_speedDialSSD.refreshGroupsList();
      //fvd_speed_dial_speedDialSSD.refreshCurrentGroup();

    }, false );
    
    
    
    
    this._refreshEnables();
    this._refreshExpandsStates();
    
    this.refreshScrollMode();
    
    // groups links
    this.refreshGroupsList();
    this.refreshCurrentGroup();
    
    this.refreshSearchBarExpanding();   
      
    fvd_speed_dial_gFVDSSDSettings.addObserver( fvd_speed_dial_sd_prefObserverInst );   
    fvd_speed_dial_gFVDSSDSettings.addObserver( fvd_speed_dial_sd_prefObserverInst, "browser." );
            
    this.refreshThumbsLinks();    
    this.refereshMakeHomePageStatus();  
    this.refreshMostVisitedSettings2();   
    this.refreshExpands();    
    this.refreshListType();

    
  
    var container = gBrowser.tabContainer;
    container.addEventListener("TabSelect", this._tabSelectListener, false);
    container.addEventListener("TabClose", this._tabCloseListener, false);
    
    this.observer = Components.classes['@mozilla.org/observer-service;1'].getService(Components.interfaces.nsIObserverService);
      for( var i = 0; i != this.listenFor.length; i++  ){
      this.observer.addObserver(fvd_speed_dial_observerStruct, this.listenFor[i], false); 
    }
    
    //window.addEventListener( "mousemove", this._mouseMoveListener, false );
    //window.addEventListener( "mousedown", this._mouseDownListener, false );
    //window.addEventListener( "mouseup", this._mouseUpListener, false );
    
    parent.addEventListener( "mouseup", this._mouseUpListener, false );
    parent.addEventListener( "mousedown", this._mouseDownListener, false );
    
    
    
    // init text color adjuster
    FVDSDSSDTextColorAdjuster.stylesheets.push(document.styleSheets[3]);
    FVDSDSSDTextColorAdjuster.stylesheets.push(this.parentDocument.styleSheets[2]);
    FVDSDSSDTextColorAdjuster.adjust();
    
    parent.HtmlSearch.setup.call(parent.HtmlSearch);
    
    this.refreshRestoreSessionButton();
    
    setTimeout( function(){
      
      that.RateMessage.displayIfNeed();
      
    }, 5000 );
    
    setTimeout( function(){
      
      if( fvd_speed_dial_Sync.getState() == "has_update" ){
        that.HasSyncUpdatesMessage.display();
      }
      
    }, 0 );
    
    this.HasSyncUpdatesMessage.refreshSyncButtonVisibility(); 
    
    this.HasSyncUpdatesMessage.refreshSyncButtonActivity();
    
    this.Search.refreshState();
    
    // setup  themes
    //document.styleSheets[3].insertRule( "@import url(chrome://fvd.speeddial/skin/sd/skin/dials/themes/dark/style.css);", 0 );

    setTimeout( function(){
      that.buildCells();
    }, 0 );
    
    // prevent double click on search bar
    var searchBar = document.getElementById( "searchBar" );
    searchBar.addEventListener( "dblclick", function( event ){
      event.stopPropagation();
    }, false ); 
    
    
    // poweroff enable listener
    var enablePoweroffButton = document.querySelector( '#expand_message .enablePowerOffMessage' );
        
    enablePoweroffButton.addEventListener( "click", function(){
      
      fvd_speed_dial_gFVDSSDSettings.displayWindow( "panePoweroff" );
      
    } );
    enablePoweroffButton.addEventListener( "dblclick", function( event ){
      event.stopPropagation();
    } );  
    enablePoweroffButton.addEventListener( "mousedown", function( event ){
      event.stopPropagation();
    } );  
    
    document.getElementById( "dontDisplayAgainCollapsedMessage" ).addEventListener("command", function(){
      
      var prefName = "dont_display_collapsed_message.nopoweroff";
      
      if( fvd_sd_PowerOff.isEnabled() ){
        prefName = "dont_display_collapsed_message.poweroff";
      }
      
      fvd_speed_dial_gFVDSSDSettings.setBoolVal( prefName, true );
      
      that.refreshCollapsedMessage();
      
    }, false);
    
    document.getElementById( "topAddGroupButton" ).addEventListener( "click", function( event ){
      
      if( event.button == 0 ){
        that.addGroup()
      }
      
    }, false );
      
  },
  
  fillContextMenuScrollingType: function( menuId ){
    
    var elem = document.querySelector( "#" + menuId + " menuitem[sdscrolltype="+this.scrollingMode()+"]" );
    
    elem.setAttribute( "checked", true );
    
  },  
  
  fillContextMenuThemesList: function( parent ){
    
    var themes = [
      "white",
      "dark"
    ];
    
    var activeTheme = fvd_speed_dial_gFVDSSDSettings.getStringVal( "sd.active_theme" );
    
    var parentNode = document.getElementById( parent );
    
    while( parentNode.firstChild ){
      parentNode.removeChild( parentNode.firstChild );
    }
    
    themes.forEach(function( theme ){
      
      var label = fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "sd.themes." + theme );
      var item = document.createElement( "menuitem" );      
      item.setAttribute( "type", "radio" );
      item.setAttribute( "label", label );
      
      item.addEventListener( "command", function(){
        
        fvd_speed_dial_gFVDSSDSettings.setStringVal( "sd.active_theme", theme );
        
      } );
      
      if( activeTheme == theme ){
        item.setAttribute( "checked", true );
      }
      
      parentNode.appendChild( item );
      
    });
    
  },
  
  refreshBg: function(){        
    // use shadows for groups only if user not selected color and not selected background image(type No Image)
    var useShadowsForGroups = true;
    
    if( fvd_speed_dial_gFVDSSDSettings.getBoolVal( "sd.bg.enable_color" ) ){
      this.backgroundAdjuster.color = fvd_speed_dial_gFVDSSDSettings.getStringVal( "sd.bg.color" );   
      useShadowsForGroups = false;    
    }
    else{
      this.backgroundAdjuster.color = this.backgroundAdjuster.getDefaultColor();
    }   
      
    this.backgroundAdjuster.image = this.backgroundAdjuster.currentBgUrl();
    this.backgroundAdjuster.imageLocationType = fvd_speed_dial_gFVDSSDSettings.getStringVal( "sd.bg.type" );
    
    // clear bg image cache
    if( this.backgroundAdjuster.image && this.backgroundAdjuster.imageLocationType != "no_image" ){
      this.backgroundAdjuster.image += "?_="+Math.random();
      useShadowsForGroups = false;
    }
    // setup groups shadows
    document.getElementById( "groupsBox" ).setAttribute( "use_shadows", useShadowsForGroups ? "1" : "0" );
    
    this.backgroundAdjuster.adjust();
  },
  
  Search:{
    textBoxPressButton: function( event ){
      if( event.keyCode == 13 ){
        this.doSearch();
      }
    },
    
    doSearch: function( event ){
      
      // check toolbar installed
      try{
        var key = "ff_fvdsd";
        if(fvd_speed_dial_speedDialSSD._getMainWindow().fvd_speed_dial_fvdSSD.toolbarInstalled){
          key = "ff_fvdsd_toolbar";
        } 
      }
      catch( ex ){
    
      }

      
      var searchText = document.getElementById("q").value.trim();
      if( searchText ){
        parent.document.location = "http://flashvideodownloader.org/addon_search/?q="+encodeURIComponent(searchText)+"&from="+key;
      }
    },
    
    refreshState: function(){
      var box = document.getElementById( "searchBar" );
      
      if( fvd_speed_dial_gFVDSSDSettings.getBoolVal( "sd.disable_custom_search" ) ){
        box.setAttribute( "hidden", true );
      }
      else{
        box.removeAttribute( "hidden" );        
      }
    }
  },
  
    init: function(){ 
    
        this.registry = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("fvd.sd.");
    
    try{
          this.storage = fvd_speed_dial_Storage;      
    }
    catch( ex ){
      //dump( "Fail init storage\r\n" );  
    } 

    },
  
  uninit: function(){
    try{
      var container = gBrowser.tabContainer;
      container.removeEventListener("TabSelect", this._tabSelectListener, false);
      container.removeEventListener("TabClose", this._tabCloseListener, false);
      
      fvd_speed_dial_gFVDSSDSettings.removeObserver( fvd_speed_dial_sd_prefObserverInst );    
      fvd_speed_dial_gFVDSSDSettings.removeObserver( fvd_speed_dial_sd_prefObserverInst, "browser." );
      
        for( var i = 0; i != this.listenFor.length; i++  ){
        this.observer.removeObserver(fvd_speed_dial_observerStruct, this.listenFor[i]);
      }
          
      // close windows
      for( var i = 0; i != this.childWindows.length; i++ ){
        try{
          this.childWindows[i].close();
        }
        catch( ex ){
          //dump( "FAIL " + ex + "\r\n" );
        }
      }
      
      //window.removeEventListener( "mousemove", this._mouseMoveHandler, false );
      //window.removeEventListener( "mousedown", this._mouseDownListener, false );
      //window.removeEventListener( "mouseup", this._mouseUpListener, false );
      
      parent.removeEventListener( "mouseup", this._mouseUpListener, false );
      parent.removeEventListener( "mousedown", this._mouseDownListener, false );
      
      // notify observers that dial closed
      
      this.observer.notifyObservers(null, "FVD.Toolbar-SD-Dial-Page-Closed", this.id);    
    }
    catch( ex ){
      
    }   
  },
  
  startMigrate: function(){
    openDialog('chrome://fvd.speeddial/content/dialogs/fvd_sd_migrate.xul', '', 'chrome,titlebar,toolbar,centerscreen,dialog=yes');
  },
  
  changeCustomSize: function(){
    
    fvd_speed_dial_gFVDSSDSettings.displayWindow( "change_custom_size" );
      
  }

};

var fvd_speed_dial_observerStruct = {
    observe: function(aSubject, aTopic, aData){
    
    switch (aTopic) {
      case 'FVD.Toolbar-SD-Deny-Updated':
        fvd_speed_dial_speedDialSSD.buildCells();
      break;
      case 'FVD.Toolbar-SD-Group-Updated':
        fvd_speed_dial_speedDialSSD.refreshGroupsList();
        fvd_speed_dial_speedDialSSD.refreshCurrentGroup();
      break;
      case 'FVD.Toolbar-SD-Dial-Moved':
        fvd_speed_dial_speedDialSSD.refreshGroupsList({
          rebuildPopupMoveToGroupsList: false,
          rebuildMainGroupsList: true
        });
        fvd_speed_dial_speedDialSSD.refreshCurrentGroup();
      break;
      case 'FVD.Toolbar-SD-Group-Removed':
        
        fvd_speed_dial_speedDialSSD.afterRemovingGroupPreparations();
          
        fvd_speed_dial_speedDialSSD.buildCells();
      break;
      case 'FVD.Toolbar-SD-Group-Added':      
        fvd_speed_dial_speedDialSSD.currentGroupId = aData;
        fvd_speed_dial_speedDialSSD.refreshGroupsList();
        fvd_speed_dial_speedDialSSD.refreshCurrentGroup();
        fvd_speed_dial_speedDialSSD.buildCells();
      break;
      case 'FVD.Toolbar-SD-Dial-Added': 
        fvd_speed_dial_speedDialSSD.refreshGroupsList();
        fvd_speed_dial_speedDialSSD.refreshCurrentGroup();
      break;
      
      case 'FVD.Toolbar-SD-Dial-Screen-Updated':          
        // refresh cells
        
        fvd_speed_dial_speedDialSSD.preventsCacheData[aData] = Math.random();
        
        fvd_speed_dial_speedDialSSD.buildCells();
        
      break;
      
      case 'FVD.Toolbar-SD-Dial-Force-Rebuild':     
        fvd_speed_dial_speedDialSSD.buildCells();     
      break;
      
      case 'FVD.Toolbar-SD-Dial-Shedule-Rebuild':       
        fvd_speed_dial_speedDialSSD.sheduleFullRebuild();   
      break;
      
      case "FVD.Toolbar-SD-Dial-Removed":
        fvd_speed_dial_speedDialSSD.refreshGroupsList();
        fvd_speed_dial_speedDialSSD.refreshCurrentGroup();
      break;
      case "FVD.Toolbar-SD-MostVisited-Removed-Cleared":
        // cleared removed mostvisited items
        fvd_speed_dial_speedDialSSD.buildCells();
      break;
      case "FVD.Toolbar-SD-Bg-Force-Refresh":
        fvd_speed_dial_speedDialSSD.refreshBg();      
      break;
      case "FVD.Toolbar-SD-Dial-Sync-State-Updated":
        
        if( fvd_speed_dial_Sync.getState() == "has_update" ){
          fvd_speed_dial_speedDialSSD.HasSyncUpdatesMessage.display();                  
        }
        
        fvd_speed_dial_speedDialSSD.HasSyncUpdatesMessage.refreshSyncButtonActivity();    
        fvd_speed_dial_speedDialSSD.HasSyncUpdatesMessage.refreshSyncButtonVisibility();  
        
      break;
      
      case "FVD.Toolbar-SD-Dial-Sync-Turn":
        
        fvd_speed_dial_speedDialSSD.HasSyncUpdatesMessage.refreshSyncButtonVisibility();  
        
      break;
      
      case "FVD.Toolbar-SD-Dial-Sync-To-Sync-Data-Updated":
      
        fvd_speed_dial_speedDialSSD.HasSyncUpdatesMessage.refreshSyncButtonActivity();  
      
      break;
      
      case "FVD.Toolbar-SD-Dial-Sync-Completed":
      
        fvd_speed_dial_speedDialSSD.afterRemovingGroupPreparations();
      
      break;
    }
  }
};

var fvd_speed_dial_SpeedDialUrlChecker = function( callback, url ){
  this.callback = callback;
  this.url = url;
  
  this._requestorCallback = function( text, status ){
    this.callback( status );
  };
  
  this.execute = function(){
    var callback = {
      "instance": this,
      "function": this._requestorCallback
    };

    var requestor = new FvdSSDToolUrlRequestor( [this.url], callback );
    requestor.errorCallback = callback;
    requestor.execute();
  };
};


var fvd_speed_dial_sd_prefObserver = function(){
  
};

fvd_speed_dial_sd_prefObserver.prototype = {
  listPrefsToUpdateRecentlyClosed: [
    "sd.max_recently_closed_records",
    "sd.recently_closed_columns",
  ],
  listPrefsToUpdateMostVisited: [
    "sd.max_most_visited_records",
    "sd.thumbs_type_most_visited",
    "sd.most_visited_interval",
    "sd.most_visited_group_by",
    "sd.most_visited_columns",
    "sd.most_visited_order"
  ],
  listPrefsToUpdateTopSites: [
    "sd.thumbs_type",
    "sd.top_sites_columns"
  ],
  
  listBuildCellsPref:[
    "sd.enable_top_sites",
    "sd.enable_most_visited",
    "sd.enable_recently_closed"   
  ],

  listExpandsUpdatePref:[
    "sd.top_sites_expanded",
    "sd.recently_closed_expanded",
    "sd.most_visited_expanded"
  ],
  
  listListTypesUpdatePref: [
    "sd.list_type"
  ],
  
  listSearchBarExpandUpdatePref: [
    "sd.search_bar_expanded"
  ],  
  
  listRefreshBgPref: [
    "sd.bg.color",
    //"sd.bg.type",
    "sd.bg.enable_color"
    //"sd.image_type",
    //"sd.bg.url",
    //"sd.bg.file_path"
  ],
  
  
  listRefreshTextStyles: [
    "sd.text.cell_title.color",
    "sd.text.cell_url.color",
    "sd.text.list_elem.color",
    "fvd.sd.text.list_show_url_title.color",
    "fvd.sd.text.list_show_url_title.color",
    "sd.text.list_link.color",
    "sd.text.other.color",
    "sd.dials_opacity",
    "sd.fvd_sd_show_clicks_and_quick_menu"
  ],
    
    
  listRefreshGroups: [
    "sd.enable_popular_group"
  ],
    
    observe: function(aSubject, aTopic, aData){
    
        try {
            switch (aTopic) {
                case 'nsPref:changed':
        
          if( aData == "sd.thumbs_type_most_visited" || aData == "sd.thumbs_type" ){
            fvd_speed_dial_speedDialSSD._clearThumbnailsModeCache();            
          }
          
          if( aData == "sd.thumbs_type" ){
            fvd_speed_dial_gFVDSSDSettings.setStringVal( "sd.top_sites_columns", "auto" );  
          } 
          else if( aData == "sd.thumbs_type_most_visited" ){            
            fvd_speed_dial_gFVDSSDSettings.setStringVal( "sd.most_visited_columns", "auto" ); 
          }
          
          if( fvd_speed_dial_speedDialSSD._displayMode() == "recently_closed" ){
            if( this.listPrefsToUpdateRecentlyClosed.indexOf(aData) != -1 ){
              fvd_speed_dial_speedDialSSD.buildCells();
            }
          }
          else if( fvd_speed_dial_speedDialSSD._displayMode() == "most_visited" ){
            if( this.listPrefsToUpdateMostVisited.indexOf(aData) != -1 ){
              fvd_speed_dial_speedDialSSD.mostVisitedInterval = null;
              fvd_speed_dial_speedDialSSD.mostVisitedGroupBy = null;
              fvd_speed_dial_speedDialSSD.refreshMostVisitedSettings2();
              fvd_speed_dial_speedDialSSD.refreshThumbsLinks();
              fvd_speed_dial_speedDialSSD.buildCells();
            }
          }
          else if( fvd_speed_dial_speedDialSSD._displayMode() == "top_sites" ){
            if( this.listPrefsToUpdateTopSites.indexOf(aData) != -1 ){                
              fvd_speed_dial_speedDialSSD.refreshThumbsLinks();
              fvd_speed_dial_speedDialSSD.buildCells();
            }           
          }
          
          if( this.listRefreshGroups.indexOf(aData != -1) ){
            if( aData == "sd.enable_popular_group" ){
              if( !fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.enable_popular_group") && fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.default_group") == "all" ){
                fvd_speed_dial_gFVDSSDSettings.setStringVal("sd.default_group", "-1"); // set default group as last opened
              }
              
              fvd_speed_dial_speedDialSSD.currentGroupId = null;
              fvd_speed_dial_speedDialSSD.refreshGroupsList();
              fvd_speed_dial_speedDialSSD.refreshCurrentGroup();
              fvd_speed_dial_speedDialSSD.buildCells();
            }
          }
          
          if( this.listRefreshTextStyles.indexOf(aData != -1) ){
            FVDSDSSDTextColorAdjuster.adjust();
          }
                    
          if( this.listBuildCellsPref.indexOf(aData) != -1 ){
            fvd_speed_dial_speedDialSSD.displayMode = null; // reset display mode
            fvd_speed_dial_speedDialSSD._refreshEnables();
            fvd_speed_dial_speedDialSSD.buildCells();
          }         
          
          if( aData == "startup.homepage" || aData == "startup.page" ){
            fvd_speed_dial_speedDialSSD.refereshMakeHomePageStatus();
          }
          
          if( this.listExpandsUpdatePref.indexOf(aData) != -1 ){
            fvd_speed_dial_speedDialSSD._refreshExpandsStates();
            fvd_speed_dial_speedDialSSD.refreshExpands();
            fvd_speed_dial_speedDialSSD.setupBodyDial();
            fvd_speed_dial_speedDialSSD.adaptFrameSize();
          }
          
          
          if( this.listListTypesUpdatePref.indexOf(aData) != -1 ){
            fvd_speed_dial_speedDialSSD.listType = null;
            fvd_speed_dial_speedDialSSD.refreshListType();  
            if (fvd_speed_dial_speedDialSSD._displayModeType() != "list") {
              fvd_speed_dial_speedDialSSD.setThumbsType("list");
            }
            else{
              fvd_speed_dial_speedDialSSD.buildCells();
            }
          }
          
          // check search bar expanding
          if( this.listSearchBarExpandUpdatePref.indexOf(aData) != -1 ){
            fvd_speed_dial_speedDialSSD.searchBarExpanded = null;
            fvd_speed_dial_speedDialSSD.refreshSearchBarExpanding();
            fvd_speed_dial_speedDialSSD.adaptFrameSize();
          }         
          
          // check refresh display type
          // check any types matches to refresh numbers of records of any type
          if( this.listPrefsToUpdateMostVisited.indexOf(aData) != -1 ||
            this.listPrefsToUpdateRecentlyClosed.indexOf(aData) != -1 ||
            this.listPrefsToUpdateTopSites.indexOf(aData) != -1 ){
            fvd_speed_dial_speedDialSSD.refreshDisplayType();
          }
          
          // special prefs
          if( aData == "sd.show_url_in_dial" ){
            fvd_speed_dial_speedDialSSD.showUrlInDial = null;
            if( fvd_speed_dial_speedDialSSD._displayModeType() == "thumbs" ){
              var cells = document.getElementsByClassName("sd_cell");
              for( var i = 0; i != cells.length; i++ ){
                cells[i].setAttribute( "display_title_2", fvd_speed_dial_speedDialSSD._getShowUrlInDial() );
              }
            }
          }
          else if( aData == "sd.thumbs_icons_and_titles" ){
            fvd_speed_dial_speedDialSSD.showIconsAndTitles = null;
            if( fvd_speed_dial_speedDialSSD._displayModeType() == "thumbs" ){
              var cells = document.getElementsByClassName("sd_cell");
              for( var i = 0; i != cells.length; i++ ){
                cells[i].setAttribute( "topTitle", fvd_speed_dial_speedDialSSD._showIconsAndTitles() ? "1" : "0" );
              }
            }
          }
          else if( aData == "sd.all_groups_limit_dials" ){
            // refresh only if view type is top sites and group is all
            if( fvd_speed_dial_speedDialSSD._displayMode() == "top_sites" ){
              if( fvd_speed_dial_speedDialSSD._getGroupId() == "all" ){               
                fvd_speed_dial_speedDialSSD.buildCells();
              }             
            }
            fvd_speed_dial_speedDialSSD.refreshGroupsListAllGroupsLabel();
          }
          else if( aData == "sd.display_plus_cells" ){            
            fvd_speed_dial_speedDialSSD.displayPlusCells = null;
            if( fvd_speed_dial_speedDialSSD._displayMode() == "top_sites" ){
              // rebuild dials
              fvd_speed_dial_speedDialSSD.buildCells();
            }
          }
    
          if( aData == "sd.custom_dial_width" ){
            
            if( fvd_speed_dial_speedDialSSD._displayMode() == "top_sites" ){
            
              if( fvd_speed_dial_speedDialSSD._thumnailsMode() == "custom" ){
                fvd_speed_dial_speedDialSSD.sheduleRebuildCells();              
              }
              else{
                fvd_speed_dial_speedDialSSD.setThumbsType( "custom" );
              } 
              
            }
            
          }
          else if( aData == "sd.custom_dial_width_mostvisited" ){
            
            if( fvd_speed_dial_speedDialSSD._displayMode() == "most_visited" ){
            
              if( fvd_speed_dial_speedDialSSD._thumnailsMode() == "custom" ){
                fvd_speed_dial_speedDialSSD.sheduleRebuildCells();              
              }
              else{
                fvd_speed_dial_speedDialSSD.setThumbsType( "custom" );
              } 
              
            }
            
          }
          
          if( aData == "scrolling" ){       
            fvd_speed_dial_speedDialSSD.refreshScrollMode();
            fvd_speed_dial_speedDialSSD.buildCells();           
          }
          
          // background specified settings
          var needRebuildBg = false;
          if(  this.listRefreshBgPref.indexOf( aData ) != -1 ){
            needRebuildBg = true;
          }
          
          if( needRebuildBg ){
    
            FVDSSDMisc.runProcess( "refreshBackground", function(){             
              fvd_speed_dial_speedDialSSD.refreshBg();              
            } );
            
          }
          
          if( aData == "sd.display_restore_previous_session" ){
            fvd_speed_dial_speedDialSSD.refreshRestoreSessionButton();
            fvd_speed_dial_speedDialSSD.refreshGroupsList();
          }
          
          if( aData == "sd.disable_custom_search" ){
            fvd_speed_dial_speedDialSSD.Search.refreshState();
          }
          
          if( aData == "sd.active_theme" ){
            var themeName = fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.active_theme");
            fvd_speed_dial_Themes.setForDocument( document, themeName );
            fvd_speed_dial_speedDialSSD.refreshBg();                
          }
          
          if( aData == "dont_display_collapsed_message.nopoweroff" || aData == "dont_display_collapsed_message.poweroff" ){
            fvd_speed_dial_speedDialSSD.refreshCollapsedMessage();
          }
          
          parent.HtmlSearch.prefUpdated( aData );
                               
                  break;                
            }
        } 
        catch (ex) {
      //dump( "ERR " + ex + "\r\n" );
        }
        
    }
};


fvd_speed_dial_sd_prefObserverInst = new fvd_speed_dial_sd_prefObserver();
