try {
    // try import addon manager for extension version detection in firefox4
    Components.utils.import("resource://fvd.speeddial.modules/addonmanager.js");
  Components.utils.import('chrome://fvd.speeddial/content/include/sd/m_migrate.js');      
} 
catch (e) {
}


Components.utils.import("resource://fvd.speeddial.modules/welcome.js");
Components.utils.import("resource://fvd.speeddial.modules/screen_maker.js");
Components.utils.import("resource://fvd.speeddial.modules/settings.js");
Components.utils.import("resource://fvd.speeddial.modules/last_tab.js");
Components.utils.import("resource://fvd.speeddial.modules/google_links.js");
Components.utils.import("resource://fvd.speeddial.modules/properties.js");
Components.utils.import("resource://fvd.speeddial.modules/sync.js");
Components.utils.import("resource://fvd.speeddial.modules/storage.js");
Components.utils.import("resource://fvd.speeddial.modules/async.js");
Components.utils.import("resource://fvd.speeddial.modules/restoreprefs.js");
Components.utils.import("resource://fvd.speeddial.modules/remotead.js");



fvd_speed_dial_FVD_SSD = function(){    
  var self = this;

  const FVD_TOOLBAR_ID = "{9051303c-7e41-4311-a783-d6fe5ef2832d}";
  const SELF_ID = "pavel.sherbakov@gmail.com"; 
  const SPEED_DIAL_URL = "chrome://fvd.speeddial/content/fvd_about_blank.html";
  
  const HOTKEY_ELEM_ID = "fvd_speed_dial_hotKey";

  const SETTINGS_KEY_BRANCH = 'extensions.fvd_speed_dial.';  
  const SD_MAX_GRAB_FRAMES = 1; // limit of frames what grab preview secreens for speed dial simulteneusely
  this.SD_FRAME_CONTAINER_ID = "fvd_speed_dial_ssd_grab_frames_container";
  this.SPEED_DIAL_TOOLBAR_BUTTON_ID = "fvd_speed_dial_fvdSpeedDialButton";

  this.STORAGE_FOLDER = "FVD Toolbar";
  this.SPEED_DIAL_SCREENSHOTS_DIRECTORY = "sd";

  this.toolbarInstalled = false;

  this.aboutBlankHook = null,
  
  this._uniqueFrameNum = 0; // for page grabber, generating next frame id
  this._uniqueDialId = 0; // for generating next dial id
  this.closedDialsIds = [];
  this._dialsFrames = {};
      
  this.registry = null;           
 
  this.newXpiUrl = null; // url to new XPI toolbar file, if update available
  
  this.activeGrabFrames = 0;
    
  this.observer = null;
    
  this.lastGrabQueueId = 0;
  this.waitGrabQueue = []; // contain ids of dial updates, who waits for thread emptying
  this.queueIdsByDials = {};
  
  this.addonWillBeUninstalled = false; // flag setted when user wants to uninstall FVD Speed Dial. If flag setted addon will be removed after restart, need to do any unistall 
                     // preparations in this.uninit
  
  this.addonWillBeDisabled = false; // same as addonWillBeUninstalled, but for addon disabling
  
  this.selfId = function(){
    return SELF_ID;
  }
  
  this.bgXHRRequest = function( url ){
    
    var xhr = new XMLHttpRequest();
    xhr.open( "GET", url );   
    xhr.send( null );
    
  }
  
  /* Listen for addon changes */
  this.addonListener = {
    
    onDisabling: function( addon ){
      if( addon.id == SELF_ID ){
        self.addonWillBeDisabled = true;    
      }
    },
    
    onEnabling: function( addon ){
      if( addon.id == SELF_ID ){
        self.addonWillBeDisabled = false;   
      }
    },    
    
    onUninstalling: function( addon ){
      if( addon.id == SELF_ID ){
        self.addonWillBeUninstalled = true;   
        
        self.navigate_url("http://fvdmedia.userecho.com/list/23102-uninstalled-please-tell-us-why/?category=6594");   
      }
    },
    onOperationCancelled: function( addon ){
      if( addon.id == SELF_ID ){
        self.addonWillBeUninstalled = false;  
        self.addonWillBeDisabled = false;   
      }
    }
  }
  
  this.refreshURLBarButton = function(){
    
    var state = fvd_speed_dial_gFVDSSDSettings.getBoolVal("display_url_bar_button");
    var button = document.getElementById("fvd_speed_dial_urlBarIcon");    
    
    if( state ){
      button.removeAttribute("hidden");
    }
    else{
      button.setAttribute("hidden", true);
    }
    
  }
  
  this.fixGuids = function(){
    
    fvd_speed_dial_Storage.asyncCustomQuery( "SELECT `rowid` FROM `dials` WHERE `global_id` IS NULL", ["rowid"], function( dials ){
      
      dials.forEach( function( dial ){
        
        var guid = fvd_speed_dial_Storage.generateGUID();
        
        fvd_speed_dial_Storage.asyncCustomQuery( {
          query: "UPDATE `dials` SET `global_id` = :guid WHERE `rowid` = :rowid",
          params: {guid: guid, rowid: dial.rowid}
        } );
        
      } );
      
    } );
    
    fvd_speed_dial_Storage.asyncCustomQuery( "SELECT `rowid` FROM `dials_groups` WHERE `global_id` IS NULL", ["rowid"], function( dials ){
      
      dials.forEach( function( dial ){
        
        var guid = fvd_speed_dial_Storage.generateGUID();
        
        fvd_speed_dial_Storage.asyncCustomQuery( {
          query: "UPDATE `dials_groups` SET `global_id` = :guid WHERE `rowid` = :rowid",
          params: {guid: guid, rowid: dial.rowid}
        } );
        
      } );
      
    } );  
    
  }
  
  this.defferedActions = function(){
    
    if( fvd_speed_dial_gFVDSSDSettings.getBoolVal("toolbar.hook.about_blank") ){    
      // remove fox tab in new tab  
      if( typeof foxTab != "undefined" ){
        try{
          if( fvd_speed_dial_gFVDSSDSettings.branch("foxTab.general.").getBoolPref( "openInNewTab" ) ){
            fvd_speed_dial_gFVDSSDSettings.branch("foxTab.general.").setBoolPref( "openInNewTab", false );            
            foxTab.pref.openInNewTab = false;
            foxTab.setPref();
            
            fvd_speed_dial_gFVDSSDAboutBlankHook.restoreAboutBlank();
            fvd_speed_dial_gFVDSSDAboutBlankHook.replaceAboutBlank();
          }
        } 
        catch( ex ){
          
        }     
      }     
    }
    
    // start thumb updater
    Components.utils.import("resource://fvd.speeddial.modules/bg/thumb_updater.js");
    fvd_speed_dial_ThumbUpdater.start();
    
    /*
    var urlsToGrab = ["http://google.com", "http://yahoo.com", "http://youtube.com", "asdfasfasdfasdf", "http://blablablanigga.com", "http://naviny.by", "http://charter97.org"];
    
    for( var i = 0; i != urlsToGrab.length; i++ ){
      var url = urlsToGrab[i];
      (function(url){
        
        fvd_speed_dial_ScreenMaker.shedule( {
          type: "url",
          url: url,
          delay: 1,
          enableJs: true,
          fileName: "test"+i+".png",
          onSuccess: function(){
            dump( "success " + url + "\n" );
          },
          onFail: function(){
            dump( "fail " + url + "\n" );           
          }
        } );
        
      })(url);
    }   
    */
    
    
    
    // GUID feature introduced in version that have syncing
    // wee need force specify guids for some types of content, such as groups and dials
    if( !fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.guids_fixed") ){
      
      this.fixGuids();
      
      fvd_speed_dial_gFVDSSDSettings.setBoolVal("sd.guids_fixed", true);
      
    } 
    
    
  },
  
  this.grabQueueNextId = function(){    
    this.lastGrabQueueId++; 
    var newId = this.lastGrabQueueId;
    
    this.waitGrabQueue.push(newId);
    
    return newId;
  };
  
  this.queueMinId = function(){
    if( this.waitGrabQueue.length == 0 ){
      return null;
    }
    return this.waitGrabQueue[0];
  };
  
  this.clearQueueId = function( queueId ){
    
    var index = this.waitGrabQueue.indexOf( queueId );
    if( index != -1 ){
      this.waitGrabQueue.splice( index, 1 );
      
    }
    else{
      
    }
  };
    
  this.getDialId = function(){
    this._uniqueDialId++;
    return this._uniqueDialId;
  },
  
  this.activeSDFramesCount = function(){
    return this.activeGrabFrames;
  };
  
  this.clearGrabFrame = function(){   
    this.activeGrabFrames--;
  };
  
  this.isRemovedDialId = function( dialId ){
    dialId = parseInt( dialId );
    
    return this.closedDialsIds.indexOf( dialId ) != -1;
  };
  
  this.getNextLoadFrameId = function( dialId, queueId ){  
      
    if( this.isRemovedDialId( dialId ) ){
      //dump( "Attempt to create frame in closed dial!\r\n" );
      // wait for infinity. if sd window closed all timers-requesters will die and this frame requests finish
      return "wait";
    }
        
    if( this.activeSDFramesCount() >= SD_MAX_GRAB_FRAMES ){
      if( queueId ){
        return "wait";        
      }
      else{     
        queueId = this.grabQueueNextId();
        
        if( dialId ){
          if( !this.queueIdsByDials[dialId] ){
            this.queueIdsByDials[dialId] = [];
          }
          this.queueIdsByDials[dialId].push( queueId );
        }
        return "wait_"+queueId;       
      } 
    }
    
    if( queueId ){
      // check queueId
      if(  this.queueMinId() != null && queueId != this.queueMinId() ){
        
        return "wait";
      }
    }
    
    
    this._uniqueFrameNum++;
    if( !this._dialsFrames[dialId] ){
      this._dialsFrames[dialId] = [];
    }
    
    var frameId = "fvd_speed_dial_grab_frame_"+this._uniqueFrameNum;
    
    this._dialsFrames[dialId].push( frameId );
    
    this.activeGrabFrames++;
    
    return frameId;
  },
  
  this.clearFramesByDial = function( dialId ){
    try{
      var frames = this._dialsFrames[dialId];
      
      if( frames ){
        for( var i = 0; i != frames.length; i++ ){
          var frameId = frames[i];
          
          var frame = document.getElementById( frameId );
          if( frame ){
            this.clearGrabFrame();
            frame.parentNode.removeChild(frame);          
          }
        }     
        
        delete this._dialsFrames[dialId];
      }
      
      if( this.queueIdsByDials[dialId] ){
        for( var i = 0; i != this.queueIdsByDials[dialId].length; i++ ){
          this.clearQueueId( this.queueIdsByDials[dialId][i] );
        }
      }     
    }
    catch( ex ){
      //dump( "Fail grab frames by dial " + ex + "\r\n" );
    }
    
  },
  
        
  this.document = function(){
    return document;
  } ;   
      
  this.addCurrentURIToSpeedDial = function( event ){  
    var url = gBrowser.currentURI.spec;
    var title = gBrowser.contentDocument.title;   

    try{

      var link = null;
      var obj = gContextMenu.target;
      
      while( obj != null ){
        if( obj.tagName == "A" ){
          url = obj.href;
          break;
        }
        
        if( !obj.parentNode ){
          break;
        }
        
        obj = obj.parentNode;
      }   
        
    }
    catch( ex ){
      
    }
    
    fvd_speed_dial_speedDialSSD.createNewDial( url, title );
  };
  
  this.addTabToSpeedDial = function(tab){
    fvd_speed_dial_speedDialSSD.createNewDial( tab.linkedBrowser.currentURI.spec, tab.linkedBrowser.contentDocument.title );
  };
  
  this.goToFvdSuite = function(){
    this.navigate_url( "http://flashvideodownloader.org/fvd-suite/" );
  };
  
    
  this.navigate_url = function(url, event)
  {
    var browser = window.getBrowser();
    var tab = browser.addTab(url);
    if (tab) browser.selectedTab = tab; 
  };

  
  this.observerStruct =  {
      observe: function(aSubject, aTopic, aData){
          switch (aTopic) {
    
      case "FVD.Toolbar-SD-Dial-Page-Closed":
        
        fvdSSD.clearFramesByDial(aData);
        fvdSSD.closedDialsIds.push( parseInt(aData) );
        
      break;
    }
      }
  };

  this.refreshAboutBlankHookMoreTimes = function(){
    
    var times = 20;
    
    var that = this;
    
    function intCallback(){
      times--;
      if( times == 0 ){
        clearInterval( intervalInst );
      }
      that.refreshAboutBlankHook();
    }
    
    var intervalInst = setInterval( intCallback, 1000 );
    
  };
  
  this.refreshContextMenus = function(){
    
    // install FF menus
    var tabContextMenu = document.getElementById( "tabContextMenu" );
    var contentAreaContextMenu = document.getElementById( "contentAreaContextMenu" ); 
    
    if( !fvd_speed_dial_gFVDSSDSettings.getBoolVal( "sd.show_in_context_menu" ) ){
      var tabMenuItem = document.getElementById( "fvd_speed_dial_fvd_context_search_tab" );
      if( tabMenuItem ){
        tabMenuItem.parentNode.removeChild( tabMenuItem );
      }
      
      var contextMenuItem = document.getElementById("fvd_speed_dial_fvd_context_search");
      if( contextMenuItem ){
        contextMenuItem.parentNode.removeChild( contextMenuItem );
      }
    }
    else{
      if( !document.getElementById( "fvd_speed_dial_fvd_context_search_tab" ) ){
        var tabMenuItem = document.getElementById( "fvd_speed_dial_fvdssd__fvd_context_search_tab" ).cloneNode( true );     
        tabMenuItem.setAttribute( "id", "fvd_speed_dial_fvd_context_search_tab" );
        tabContextMenu.appendChild( tabMenuItem );
      }
      
      if( !document.getElementById("fvd_speed_dial_fvd_context_search") ){
        var contextMenuItem = document.getElementById( "fvd_speed_dial_fvdssd__fvd_context_search" ).cloneNode( true );     
        contextMenuItem.setAttribute( "id", "fvd_speed_dial_fvd_context_search" );
        contentAreaContextMenu.appendChild( contextMenuItem );
      }       

    }
    
  };

    this.init = function(){     
    
    if(fvd_speed_dial_gFVDSSDSettings.getStringVal("install_date") == "0"){
      fvd_speed_dial_gFVDSSDSettings.setStringVal("install_date", new Date().getTime().toString());
    }
    
    this.refreshURLBarButton();
    
    // check need enable search
    if( fvd_speed_dial_gFVDSSDSettings.getBoolVal( "enable_search1" ) ){
      fvd_speed_dial_gFVDSSDSettings.setBoolVal( "sd.disable_custom_search", false );
      fvd_speed_dial_gFVDSSDSettings.setBoolVal( "enable_search1", false );
    }
    
    // init google links
    fvd_speed_dial_GoogleLinks.start( window );
    
    // init screen maker vars
    fvd_speed_dial_ScreenMaker.saveToDir = this.STORAGE_FOLDER + "/" + this.SPEED_DIAL_SCREENSHOTS_DIRECTORY;
    
    var that = this;
    
    try{
      AddonManager.getAddonByID(FVD_TOOLBAR_ID, function(addon){
              var v = true;
              // full suite toolbar found
              if (addon && !addon.appDisabled && !addon.userDisabled) {
                  v = false;
          self.toolbarInstalled = true;
              }
  
        // init speedDial(use only passive mode)
        fvd_speed_dial_speedDialSSD.init();
            fvd_speed_dial_speedDialSSD.passiveMode = true; 
        
        //init new tab hook
        fvd_speed_dial_gFVDSSDAboutBlankHook.setupInitialPages();
        fvd_speed_dial_fvdSSD.refreshAboutBlankHook();  
        
        try{
          
          function _gbrowserLoadListener(){
                            
            if( gBrowser.contentDocument.location.href == fvd_speed_dial_gFVDSSDAboutBlankHook.aboutBlankUrl ){           
              // need to empty url bar if active tab is speed dial            
              document.getElementById( "urlbar" ).value = "";
              focusAndSelectUrlBar(); 
            }
            
            gBrowser.removeEventListener( "load", _gbrowserLoadListener, true );
            
          }
          
          gBrowser.addEventListener( "load", _gbrowserLoadListener, true );
                  
        }
        catch( ex ){
          
        }
        
        that.refreshAboutBlankHookMoreTimes();
        
        // some configuring of Firefox settings
        // save 40 recently closed tabs records
        //gFVDSSDSettings.branch("browser.sessionstore.").setIntPref( "max_tabs_undo", 40 );
        
        
        self.refreshContextMenus();
  
        self.isFirstStart( function( firstStart, isFirstRun, currentVersion ){
          
          if( firstStart ){ 
                        
            var url = "";
            
            var osString = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime).OS;  
            
            if( osString == "Darwin" || osString == "Linux" ){
              url = "http://fvdspeeddial.com/page/welcome-mac";
            }
            else{
              url = "http://fvdspeeddial.com/page/welcome-firefox";
            }   
              
            if( url ){
            // not available in this version
              self.navigate_url( url );
            }
            
            if( isFirstRun ){
              self.main_button_insert();                  
            }         
          }
          else{

          }
          // init last tab vars and start it
          // second param mean need to refresh lasttab specific vars
          fvd_speed_dial_LastTab.start( window, isFirstRun );                      
        } );
        
        fvd_speed_dial_gFVDSSDSettings.addObserver( fvd_speed_dial_fvdPrefObserver );
        
        
        self.observer = Components.classes['@mozilla.org/observer-service;1'].getService(Components.interfaces.nsIObserverService);
        self.observer.addObserver(self.observerStruct, 'FVD.Toolbar-SD-Dial-Page-Closed', false);
        
        setTimeout( function(){
          fvd_speed_dial_fvdSSD.defferedActions();            
        }, 1000 );
      
        
          });
      
      // check migration 
      fvd_speed_dial_FVDSDSingleMMigrate.checkMigration();
      
      self.setupMainMenu();
      self.refreshHotKey();
      
      // add addon listener
      AddonManager.addAddonListener( this.addonListener );
  
    }
    catch( ex ){

    }
        
    this.sizeMigration();

    // set listener to url bar icon
    document.getElementById("fvd_speed_dial_urlBarIcon").addEventListener( "click", function(){
      try{
        fvd_speed_dial_fvdSSD.addCurrentURIToSpeedDial(); 
      }
      catch( ex ){

      }     
      
    }, false ); 
    
    // restore prefs, if addon has been disabled or uninstalled
    
    fvd_speed_dial_RestorePrefs.restorePrefs();
    
    fvd_speed_dial_RemoteAD.init( fvd_speed_dial_gFVDSSDSettings._branch() );
      
    };
  
  this.sizeMigration = function(){
    
    // size migration
    
    function _getSize( mode ){
      
      switch( mode ){
        case "big":
          return fvd_speed_dial_speedDialSSD.BIG_CELL_SIZE;
        break;
        case "medium":
          return fvd_speed_dial_speedDialSSD.MEDIUM_CELL_SIZE;          
        break;
        case "small":
          return fvd_speed_dial_speedDialSSD.SMALL_CELL_SIZE;         
        break;                
      }
      
      return null;
      
    }
    
    var speedDialMode = fvd_speed_dial_gFVDSSDSettings.getStringVal( "sd.thumbs_type" );
    
    if( speedDialMode != "list" && speedDialMode != "custom" ){
      
      var size = _getSize( speedDialMode );
      fvd_speed_dial_gFVDSSDSettings.setStringVal( "sd.thumbs_type", "custom" );
      fvd_speed_dial_gFVDSSDSettings.setIntVal( "sd.custom_dial_width", size );           
    }
    
    var mostVisitedMode = fvd_speed_dial_gFVDSSDSettings.getStringVal( "sd.thumbs_type_most_visited" );
    
    if( mostVisitedMode != "list" && mostVisitedMode != "custom" ){
      var size = _getSize( mostVisitedMode );
      fvd_speed_dial_gFVDSSDSettings.setStringVal( "sd.thumbs_type_most_visited", "custom" );
      fvd_speed_dial_gFVDSSDSettings.setIntVal( "sd.custom_dial_width_mostvisited", size );     
    }
    
  };
  
  this.refreshAboutBlankHook = function(){
    try{
      if( fvd_speed_dial_gFVDSSDSettings.getBoolVal("toolbar.hook.about_blank") ){
        fvd_speed_dial_gFVDSSDAboutBlankHook.replaceAboutBlank();         
      }   
      else{
        fvd_speed_dial_gFVDSSDAboutBlankHook.restoreAboutBlank();
      } 
    }
    catch( ex ){
      
    }
  };
    
  this.isFirstStart = function( callback ){
    
    var that = this;
    
    AddonManager.getAddonByID( SELF_ID, function( addon ){
      var isFirstStart = false; // first start after install/update     
      var isFirstRun = false; // first run after install update
      
      if( that._isFirstRun ){
        isFirstRun = true;
      }
      else{
        try{
          fvd_speed_dial_gFVDSSDSettings.getBoolVal( "first_run_completed" );         
        }
        catch( ex ){
          that._isFirstRun = true;
          isFirstRun = true;
          fvd_speed_dial_gFVDSSDSettings.setBoolVal( "first_run_completed", true );
        } 
      }
        
      var lastVersion = fvd_speed_dial_gFVDSSDSettings.getStringVal( "last_first_start_version" );
      
      if( lastVersion != addon.version ){
        isFirstStart = true;
        fvd_speed_dial_gFVDSSDSettings.setStringVal( "last_first_start_version", addon.version );
      }
       
      callback( isFirstStart, isFirstRun, addon.version );

    } );
    
  };
    
    this.showUpdateInstalledPanel = function(newVersion, currentVersion, xpiUrl){
        try {
      if( !this.canDisplayPopup() ){
        return false;
      }
      
            this.newXpiUrl = xpiUrl;
            
            var panel = document.getElementById("fvd_toolbar_update_installed");
            var button = document.getElementById('fvd_btn_download_media');
            panel.openPopup(button, 'after_start', 0, 0, false, false);
            
            //var bundle = Components.classes['@mozilla.org/intl/stringbundle;1'].getService(Components.interfaces.nsIStringBundleService).createBundle('chrome://fvd.toolbar/locale/fvd.toolbar.properties');
            //var title = bundle.GetStringFromName('update_installed.title');
            document.getElementById( "install_update_cur_version" ).textContent = currentVersion;
            document.getElementById( "install_update_new_version" ).textContent = newVersion;
                      
            
        } 
        catch (ex) {
            //dump("Error with show panel " + ex + "\r\n");
        }
    };
  
    
    this.restartFirefox = function(){
        try {
            var boot = Components.classes["@mozilla.org/toolkit/app-startup;1"].getService(Components.interfaces.nsIAppStartup);
            boot.quit(Components.interfaces.nsIAppStartup.eForceQuit | Components.interfaces.nsIAppStartup.eRestart);
        } 
        catch (ex) {
        
        }
    };
        
    this.updateTabPreviewState = function(){
        this.loadTabPreviewState(function(value){
            tabPreview.enabled = value;
        });
    };
  
  this.xul_ns_resolver = function(prefix)
  {
    var ns = {
        'xul' : 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul',
        'html' : 'http://www.w3.org/1999/xhtml'
    };
    return ns[prefix] || null;
  };
  
  this.main_button_remove = function()
  {   
    try
    {
      var toolbox = document.getElementById('navigator-toolbox');
      var tr = document.evaluate('//xul:toolbox[@id="navigator-toolbox"]/xul:toolbar[@customizable="true"]', document.documentElement, this.xul_ns_resolver, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
      var toolbar = tr.iterateNext();
      while (toolbar != null)
      {
        if (toolbar.currentSet.indexOf(self.SPEED_DIAL_TOOLBAR_BUTTON_ID) > -1)
        {
          var cs = toolbar.currentSet.split(',');
          var ncs = [];

          var i = null;
          while ((i = cs.shift()) != undefined)
          {
            if (i != self.SPEED_DIAL_TOOLBAR_BUTTON_ID) ncs.push(i);
          }

          toolbar.currentSet = ncs.join(',');
          toolbar.setAttribute('currentset', toolbar.currentSet);
          toolbox.ownerDocument.persist(toolbar.id, 'currentset');
          break;
        }
                toolbar = tr.iterateNext();
      }

    } catch (e) {}

  };
  
  this.mainButtonClick = function( event ){
    this.openSpeedDialSingle();
  };
  
  this.refreshHotKey = function(){
    
    if(fvd_speed_dial_gFVDSSDSettings.getBoolVal( "sd.use_hot_key" )){
      
      var hotKey = document.getElementById( HOTKEY_ELEM_ID );
      
      if( !hotKey ){
        
        var mainKeySet = document.getElementById("mainKeyset");
        var hotKey = document.createElement("key");

        hotKey.setAttribute( "id", HOTKEY_ELEM_ID );
        
        mainKeySet.appendChild(hotKey); 
        
        hotKey.addEventListener( "command", function(){
          self.openSpeedDialSingle();
        }, false );
        
      }
      
      var keyData = fvd_speed_dial_Misc.parseHotKey(fvd_speed_dial_gFVDSSDSettings.getStringVal( "sd.hot_key" ));     
            
      hotKey.setAttribute( "key", keyData.key );
      hotKey.setAttribute( "modifiers", keyData.modifiers );  
      
    }
    else{
      var hotKey = document.getElementById( HOTKEY_ELEM_ID );
      hotKey.setAttribute( "disabled", true );      
    }   
    
  },
  
  this.openSpeedDialSingle = function(){
    // check tabs list and if speed dial already exists open old tab
    
    try{
      
      if( gBrowser.currentURI.spec == SPEED_DIAL_URL ){
        return;
      }
      
      var opened = false;
      
      for( var i = 0; i != gBrowser.tabs.length; i++ ){
        var tab = gBrowser.tabs[i];
        var browser = gBrowser.getBrowserForTab( tab );
        if( browser.currentURI.spec == SPEED_DIAL_URL ){  
          gBrowser.selectedTab = tab;     
          opened = true;
          break;
        }
      }
      
      if( !opened ){
        // now open in active tab
        
        //gBrowser.contentDocument.location = SPEED_DIAL_URL;
        
        var b = gBrowser.getBrowserForTab( gBrowser.selectedTab );
        b.loadURI( SPEED_DIAL_URL, null, null );
        /*
        
        var tab = gBrowser.addTab( SPEED_DIAL_URL );
        if (tab){
          gBrowser.selectedTab = tab;
        }
        
        */
      }
      
    }
    catch( ex ){
      dump( ex + "\n" );
      dump( ex.stack + "\n" );
    }

  };
  
  this.contextButtonClick = function( event ){
    var menu = document.getElementById( "fvd_speed_dial_fvdssdMainContentMenu" );
    menu.openPopup( event.target, "before_start", 0, 0, false, false );
  };
  
  
  this.setupMainMenu = function(){
    var button = document.getElementById( self.SPEED_DIAL_TOOLBAR_BUTTON_ID );
    var menu = null;
    if( button && button.childNodes.length == 0 ){
      menu = document.getElementById( "fvd_speed_dial_fvdssdMainContentMenu" ).cloneNode(true);
      menu.removeAttribute("id");
      button.appendChild( menu );     
    }
  };
  
  this.main_button_in_toolbar = function(){
    var toolbar = document.getElementById('nav-bar');
    return toolbar && toolbar.currentSet.indexOf(self.SPEED_DIAL_TOOLBAR_BUTTON_ID) != -1;
  };
  
  this.main_button_insert = function()
  {   
    var toolbar = document.getElementById('nav-bar');
    
//    self.SPEED_DIAL_TOOLBAR_BUTTON_ID
    
    var insertBefore = "search-container";    
    
    if (toolbar && toolbar.currentSet.indexOf(self.SPEED_DIAL_TOOLBAR_BUTTON_ID) == -1)
    {
      var sci = toolbar.currentSet.split(',');
      var nsci = [];
      if (sci.indexOf(insertBefore) != -1)
      {
        var i = null;
        while ((i = sci.shift()) != undefined)
        {
          if ((i == insertBefore) && (nsci.indexOf(self.SPEED_DIAL_TOOLBAR_BUTTON_ID) == -1)) nsci.push(self.SPEED_DIAL_TOOLBAR_BUTTON_ID);
          nsci.push(i);
        }
      } else
      {
        nsci = sci;
        nsci.push(self.SPEED_DIAL_TOOLBAR_BUTTON_ID);
      }

      toolbar.currentSet = nsci.join(',');
      toolbar.setAttribute('currentset', toolbar.currentSet);

      var toolbox = document.getElementById('navigator-toolbox');
      if (toolbox)
      {
        toolbox.ownerDocument.persist(toolbar.id, 'currentset');
      }
      
      self.setupMainMenu();
    }
  };
 
    
    this.uninit = function(){
      
    this.observer.removeObserver(this.observerStruct, 'FVD.Toolbar-SD-Dial-Page-Closed');   
    
    var browserRoot = fvd_speed_dial_gFVDSSDSettings.branch("browser.");
    
    if( this.addonWillBeUninstalled ){
      fvd_speed_dial_gFVDSSDSettings.reset( "last_first_start_version" );
      fvd_speed_dial_gFVDSSDSettings.reset( "first_run_completed" );  
            
      if( browserRoot.getCharPref( "newtab.url" ) == SPEED_DIAL_URL ){
        browserRoot.clearUserPref( "newtabpage.enabled" );
        browserRoot.clearUserPref( "newtab.url" );  
      }
          
    }

    if( this.addonWillBeDisabled || this.addonWillBeUninstalled ){
      // clear pref for home page     
      
      if( browserRoot.getCharPref( "startup.homepage" ) == SPEED_DIAL_URL ){
        fvd_speed_dial_RestorePrefs.setPrefToRestore( 
          "browser.startup.homepage", SPEED_DIAL_URL, "string" );
      }
      
      if( browserRoot.getCharPref( "newtab.url" ) == SPEED_DIAL_URL ){
        fvd_speed_dial_RestorePrefs.setPrefToRestore( 
          "browser.newtab.url", SPEED_DIAL_URL, "string" );
      }
      
      
      browserRoot.clearUserPref( "startup.homepage" );  
      browserRoot.clearUserPref( "newtab.url" );
      
    }   
    
    };
    
  

    
    window.addEventListener('load', function(){
    
        self.init.call(self)
    }, false);
    window.addEventListener('unload', function(){
        self.uninit.call(self)
    }, false);

};


var fvd_speed_dial_fvdPrefObserver = {
    observe: function(aSubject, aTopic, aData){ 
    try {
      
      switch (aTopic) {
        case 'nsPref:changed':
        
          if( aData == "toolbar.hook.about_blank" ){
            fvd_speed_dial_fvdSSD.refreshAboutBlankHook();            
          } 
          else if( aData == "sd.show_in_context_menu" ){
            fvd_speed_dial_fvdSSD.refreshContextMenus();
          }
          else if( aData == "sd.use_hot_key" || aData == "sd.hot_key" ){
            fvd_speed_dial_fvdSSD.refreshHotKey();
          } 
          else if( aData == "scrolling" ){
            fvd_speed_dial_gFVDSSDSettings.setStringVal( "sd.most_visited_columns", "auto" );
            fvd_speed_dial_gFVDSSDSettings.setStringVal( "sd.top_sites_columns", "auto" );            
          }
          else if( aData == "display_url_bar_button" ){
            fvd_speed_dial_fvdSSD.refreshURLBarButton();
          }

          
        break;
      }
    }
    catch( ex ){

    }
  }
};

var fvd_speed_dial_fvdSSD = new fvd_speed_dial_FVD_SSD();

window.addEventListener("aftercustomization", function(){
  fvd_speed_dial_fvdSSD.setupMainMenu();
}, false);  


