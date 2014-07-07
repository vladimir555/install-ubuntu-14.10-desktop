var EXPORTED_SYMBOLS = ["fvd_speed_dial_LastTab"];

Components.utils.import("resource://fvd.speeddial.modules/settings.js");

fvd_speed_dial_LastTab = {
  instances : [],

  start : function(window, needRefresh) {

    var instance = new _fvd_speed_dial_LastTab(window.gBrowser);
    instance.start(needRefresh);
    this.instances.push(instance);

    var that = this;

    window.addEventListener("unload", function() {
      // cleanup
      try {
        var index = null;
        for (var i = 0; i != that.instances.length; i++) {
          if (instance == that.instances[i]) {
            index = i;
            break;
          }
        }

        if (index !== null) {
          that.instances.splice(index, 1);
        }
      } catch( ex ) {

      }

    }, false);

  }
}

_fvd_speed_dial_LastTab = function(gBrowser) {

  this.gBrowser = gBrowser;

  var self = this;

  function getDocumentTab(doc) {
    var tabs = self.gBrowser.tabContainer.childNodes;

    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].linkedBrowser.contentDocument == doc) {
        return tabs[i];
      }
    }
  }

  var loadListener = function(event) {

    try {

      var doc = event.originalTarget;
      var win = doc.defaultView;

      if ( typeof win != 'undefined' && win.parent != win) {
        return;
      }

      var tab = getDocumentTab(doc);
      if (!tab) {
        return;
      }

      var oneTab = self.gBrowser.tabContainer.childNodes.length == 1;
      var emptyTab = self.gBrowser.contentDocument.location == "about:blank" || self.gBrowser.contentDocument.location == "about:newtab";

      if (oneTab && emptyTab) {
        self.gBrowser.contentDocument.location = "chrome://fvd.speeddial/content/fvd_about_blank.html";
      }

    } catch( ex ) {

      dump("SORRY! " + ex + " \n");

    }

  }
  var prefListener = {
    observe : function(aSubject, aTopic, aData) {
      switch (aTopic) {
        case 'nsPref:changed':

          if (aData == "sd.show_in_last_tab") {
            //dump("REFERSH!!!\n");
            refresh();
          }

          break;
      }
    }
  };

  function getWindows() {
    var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].getService(Components.interfaces.nsIWindowWatcher);
    return ww.getWindowEnumerator();
  }

  function refresh() {    
    var currentState = fvd_speed_dial_gFVDSSDSettings.getBoolVal("sd.show_in_last_tab");
    var browserPrefs = fvd_speed_dial_gFVDSSDSettings.branch("browser.tabs.");
    var browserRoot = fvd_speed_dial_gFVDSSDSettings.branch("browser.");
    if (currentState) {
      try {
        var prevState = browserPrefs.getBoolPref("closeWindowWithLastTab");
        fvd_speed_dial_gFVDSSDSettings.setBoolVal("sd.closeWindowWithLastTab_prev_state", prevState);
      } catch (ex) {

      }
      browserPrefs.setBoolPref("closeWindowWithLastTab", false);

      // reset another addons:
      var windows = getWindows();
      while (windows.hasMoreElements()) {
        var window = windows.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
        try {
          if (window.SpeedDial) {
            window.SpeedDial.loadInLastTab = false;
          }
        } catch( ex ) {

        }
      }

      try {
        // now this way we dont use
        //browserRoot.setBoolPref( "newtabpage.enabled", true );
        //browserRoot.setCharPref( "newtab.url", "chrome://fvd.speeddial/content/fvd_about_blank.html" );
      } catch( ex ) {

      }
    } else {
      browserPrefs.setBoolPref("closeWindowWithLastTab", true);
      try {
        if (browserRoot.getCharPref("newtab.url") == "chrome://fvd.speeddial/content/fvd_about_blank.html") {
          browserRoot.clearUserPref("newtabpage.enabled");
          browserRoot.clearUserPref("newtab.url");
        }
      } catch( ex ) {

      }
    }

    try {
      self.gBrowser.removeEventListener("load", loadListener, true);
    } catch (ex) {
      dump(ex + "\n");
    }

    if (currentState) {
      self.gBrowser.addEventListener("load", loadListener, true);
    }
  }


  this.start = function(needRefresh) {
    fvd_speed_dial_gFVDSSDSettings.addObserver(prefListener);
    if(needRefresh) {
      refresh();  
    }    
  }
}
