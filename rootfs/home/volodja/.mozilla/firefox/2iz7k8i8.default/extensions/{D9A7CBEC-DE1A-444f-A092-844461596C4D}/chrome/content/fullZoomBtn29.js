"use strict";
var defaultfullzoomlevel_fullZoomBtn = {
  full: null,
  win : null,
  windowResizedTimer: null,

  //init
  init: function() {
    window.removeEventListener('load', this, false);
    window.addEventListener('unload', this, false);
    document.getElementById("appcontent").addEventListener("resize", this, false);

    defaultfullzoomlevel_fullZoomBtn.lastInnerWidth = defaultfullzoomlevel_fullZoomBtn.calculateWidth();

    // adding at least one button to the toolbar at first run
    var self = this;
    Application.getExtensions(function (extensions) {  
      let extension = extensions.get("{D9A7CBEC-DE1A-444f-A092-844461596C4D}");  
    
      if (extension.firstRun) {  
        // add button here.  
        var afterId = "status-bar";
        self.installButton("addon-bar", "statusbarZoomLevel", afterId);
      }  
    });

    this.showZoomLevelInStatusbar();
  },

  uninit: function() {
    window.removeEventListener('unload', this, false);
    document.getElementById("appcontent").removeEventListener("resize", this, false);
    //stop observing
    if (this.observer1)
      this.observer1.disconnect();
  },

  /** 
   * Installs the toolbar button with the given ID into the given 
   * toolbar, if it is not already present in the document. 
   * 
   * @param {string} toolbarId The ID of the toolbar to install to. 
   * @param {string} id The ID of the button to install. 
   * @param {string} afterId The ID of the element to insert after. @optional 
   */  
  installButton: function installButton(toolbarId, id, afterId) {  
    if (!document.getElementById(id)) {  
      var toolbar = document.getElementById(toolbarId);  

      var before = toolbar.firstChild;  
      if (afterId) {  
        let elem = document.getElementById(afterId);  
        if (elem && elem.parentNode == toolbar)  
            before = elem.nextElementSibling;  
      }  

      toolbar.insertItem(id, before);  
      toolbar.setAttribute("currentset", toolbar.currentSet);  
      document.persist(toolbar.id, "currentset");  

      if (toolbarId == "addon-bar")  
        toolbar.collapsed = false;  
    }  
  },

  handleEvent: function(event){
    switch (event.type){
      case 'resize':
        this.windowResized(event);
        break;
      case 'load':
        this.init(event);
        break;
      case 'unload':
        this.uninit(event);
        break;
    }
  },

  //show Zoom Level In Statusbar
  showZoomLevelInStatusbar: function(){
    this.updateDefaultButton();
    var statusbarZoomLevel = document.getElementById("statusbarZoomLevel");
    if (!statusbarZoomLevel)
      return;
    var label = Math.floor(ZoomManager.zoom * 100 + 0.5) + "%";
    if (ZoomManager.getCurrentMode(getBrowser().selectedBrowser))
      label = "F"+label;
    else
      label = "T"+label;
    statusbarZoomLevel.setAttribute("label", label);
  },

  updateDefaultButton: function(){
    let label = Math.floor(ZoomManager.zoom * 100 + 0.5) + "%";
    let btn = document.getElementById("zoom-reset-button");
    if (btn)
      btn.setAttribute("label", label);
  },

  clickStatusLabel:function(evt) {
    if (evt.type == "DOMMouseScroll") {
      this.click(evt, ZoomManager.getCurrentMode());
      return;
    }
    if (evt.button == 2/* || evt.button == 0 && evt.clientX- evt.target.boxObject.x  < 12*/) {
      evt.stopPropagation();
      evt.preventDefault();
      //
      document.getElementById("cmd_fullZoomToggle").doCommand();
      return;
    }
    if (evt.button == 1) {
      //
      document.getElementById("cmd_fullZoomReset").doCommand();
      return;
    }
    var btn = evt.target;
    this.full = ZoomManager.getCurrentMode(getBrowser().selectedBrowser);
    var popup = document.getElementById("defaultfullzoomlevel-fullZoomBtn_popup");
    //toggle
    if (popup.status == "open") {
      popup.hidePopup();
      // workaround Bug 622507
      popup.removeAttribute("height");
      popup.removeAttribute("width");
    } else {
      // workaround Bug 622507
      popup.removeAttribute("height");
      popup.removeAttribute("width");
      popup.openPopup(btn);
    }
  },

  click: function(evt, useFullZoom) {
    if (!!document.getElementById("defaultfullzoomlevel-textZoomBtn_popup2") &&
        document.getElementById("defaultfullzoomlevel-textZoomBtn_popup2").state=="open") {
      return;
    }
    if (!!document.getElementById("defaultfullzoomlevel-fullZoomBtn_popup2") &&
        document.getElementById("defaultfullzoomlevel-fullZoomBtn_popup2").state=="open") {
      return;
    }
    if (evt.type == "DOMMouseScroll") {
      this.toggleZoom(useFullZoom);
      if (evt.detail > 0) {
        //
        document.getElementById("cmd_fullZoomReduce").doCommand();
      } else {
        //
        document.getElementById("cmd_fullZoomEnlarge").doCommand();
      }
      return;
    }

    if (evt.button == 0 && evt.shiftKey) {
      evt.stopPropagation();
      var btn = evt.target;
      if (document.getElementById("defaultfullzoomlevel-fullzoombtn") == btn ||
          document.getElementById("defaultfullzoomlevel-fullzoombtn2") == btn )
        this.full = true;
      else if (document.getElementById("defaultfullzoomlevel-textzoombtn") == btn ||
          document.getElementById("defaultfullzoomlevel-textzoombtn2") == btn )
        this.full = false;

      var popup = document.getElementById("defaultfullzoomlevel-fullZoomBtn_popup");
      // workaround Bug 622507
      popup.removeAttribute("height");
      popup.removeAttribute("width");
      popup.openPopup(btn, "after_end");
    } else if (evt.button == 2 && evt.shiftKey) {
      this.openPrefWindow();
    } else {
      this.zoom(evt.button, useFullZoom)
    }
    evt.preventDefault();
    evt.stopPropagation();
    return false;
  },

  zoom: function(type, useFullZoom) {
    //AutoFit to Flase
    ZoomManager.useFullAuto = false;
    switch(type) {
      case 0:
        //
        this.toggleZoom(useFullZoom);
        document.getElementById("cmd_fullZoomEnlarge").doCommand();
        break;
      case 1: // Middle Click
        //
        this.toggleZoom(useFullZoom);
        document.getElementById("cmd_fullZoomReset").doCommand();
        defaultfullzoomlevel_fullZoomBtn.showZoomLevelInStatusbar();
        break;
      case 2: // Right Click
        //
        this.toggleZoom(useFullZoom);
        document.getElementById("cmd_fullZoomReduce").doCommand();
        break;
    }
  },

  toggleZoom: function ZoomManager_toggleZoom(useFullZoom) {
    if (useFullZoom != ZoomManager.getCurrentMode()) {
      FullZoom.toggleZoom();
    }
  },

  //option
  openPrefWindow: function () {
    window.openDialog(
      "chrome://DefaultFullZoomLevel/content/pref.xul", "DefaultFullZoomLevel:Setting",
      "chrome,titlebar,toolbar,centerscreen,modal"
    );
  },

  windowResized: function(event) {
    if (this.windowResizedTimer) {
      clearTimeout(this.windowResizedTimer);
      this.windowResizedTimer = null;
    }
    this.windowResizedTimer = setTimeout(function(self) {
      var width = self.calculateWidth();
      var diff = width - self.lastInnerWidth;
      if (Math.abs(diff) < 5)
        return;
      self.lastInnerWidth = width;
      if (FullZoom.globalAuto && !!ZoomManager.useFullAuto) {
        self.doFullZoomBy(-1, true);
      }
    },500, this);
  },

  calculateWidth: function() {
    //Reserve Sidebar Width
    var reservesidebar = this.getPref("extensions.browser.zoom.fullZoom.reserveSidebarWidth", "bool", false);
    var sidebarWidth = 0;
    var sidebarsplitterWidth = 0;
    var sidebarbox = document.getElementById("sidebar-box");
    var sidebar    = document.getElementById("sidebar");

    if (reservesidebar && sidebarbox.boxObject.width == 0) {

      sidebarWidth = Math.ceil(sidebarbox.width);
      if (!sidebarWidth)
        sidebarWidth = Math.ceil(document.defaultView.getComputedStyle(sidebar, '').
                        getPropertyValue('width').replace('px',''));

      var sidebarsplitter = document.getElementById("sidebar-splitter");
      if (sidebarsplitter.boxObject.width == 0)
        sidebarsplitterWidth = Math.ceil(document.defaultView.getComputedStyle(sidebarsplitter, '').
                                 getPropertyValue('min-width').replace('px',''));

      sidebarWidth = sidebarWidth + sidebarsplitterWidth;
    }
    //window width
    return gBrowser.mPanelContainer.boxObject.width - sidebarWidth;
  },

  //calculate zoom level for fit to window.
  getFitZoomLevel: function(useFullZoom, aBrowser, forceFit) {
    var doc = aBrowser.contentDocument;
    if (!doc.documentElement)
      return;
    //min max
    var minzoom = (this.getPref("extensions.browser.zoom.fitZoom.minimum", "int", 50)/100);
    var maxzoom = (this.getPref("extensions.browser.zoom.fitZoom.maximum", "int", 200)/100);

    ZoomManager.preserveTextSize =
            this.getPref("extensions.browser.zoom.fullZoom.fitToWidthPreserveTextSize", "bool", false);
    ZoomManager.useFullZoom = useFullZoom;

    //display width (include/exclude sidebar width)
    var width = this.calculateWidth();

    //scrollbar width
    var scw = Math.ceil((doc.defaultView.innerWidth - doc.documentElement.offsetWidth) *
              ZoomManager.getZoomForBrowser(aBrowser) );
    //display width exclude scrollbar width
    var ww = width - scw;

    //content width
    var hw = doc.documentElement.scrollWidth;
    var dw = (doc.body) ? doc.body.scrollWidth : hw;
    if (!(FullZoom.forceFitToWidth || forceFit) || ww > Math.max(hw,dw)) {
      changeZoom();
    } else {
      ZoomManager.setZoomForBrowser(aBrowser,
                                    (FullZoom.forceFitToWidth || forceFit)
                                     ? maxzoom
                                     : FullZoom.globalValue);
      setTimeout(function() {changeZoom();}, 0);
    }

    function changeZoom() {
      //content width
      var hw = doc.documentElement.scrollWidth;
      var dw = (doc.body) ? doc.body.scrollWidth : hw;
      var error = (FullZoom.forceFitToWidth || forceFit) ? 1.03: 1;
      var zoom = Math.floor(Math.floor((ww / (Math.max(hw,dw) * error)) * 20) * 5) / 100;
      zoom = Math.min(Math.max(zoom,minzoom),maxzoom);
      ZoomManager.useFullAuto = true;
      ZoomManager.useFullZoom = useFullZoom;
      ZoomManager.setZoomForBrowser(aBrowser, zoom);

      FullZoom._applyZoomToPref(aBrowser);
    }
  },

  //Apply zoom level to current tab
  doFullZoomBy: function(zoom, useFullZoom, aBrowser, forceFit) {
    var browser = aBrowser || gBrowser.selectedBrowser;
    var ss = Components.classes["@mozilla.org/browser/sessionstore;1"].
                               getService(Components.interfaces.nsISessionStore);
    if (zoom < 0) {
      defaultfullzoomlevel_fullZoomBtn.getFitZoomLevel(useFullZoom, browser, forceFit);
      return;
    }

    ZoomManager.setZoomForBrowser(browser, zoom);
    this.toggleZoom(useFullZoom);
    FullZoom._applyZoomToPref(browser);
  },

  //create popup menu
  onPopupShowing: function(event, useFullZoom) {
    //
    function cmp_val(a, b) {
      var aa = Math.floor(a);
      var bb = Math.floor(b);
      return  aa > bb ? -1 : 1;
    }
    var popup = event.target;
    while(popup.lastChild) {
      popup.removeChild(popup.lastChild);
    }

    if (typeof useFullZoom =='undefined') {
      useFullZoom = this.full;
    }
    var p = this.getPref("toolkit.zoomManager.zoomValues", "str", true);
    var s = p.split(',');
    s.sort(cmp_val);

    var arr=[];
    var zoom = Math.floor(ZoomManager.zoom * 100 + 0.5);
    for (var i=0; i<s.length; i++) {
      try{
        var x = Math.floor(s[i] * 100 + 0.5);
        if (x < zoom) {
          arr.push(zoom);
          zoom = 0;
        } else if (x == zoom) {
          zoom = 0;
        }
        arr.push(x);
      }catch(ex) {}
    }
    if (zoom != 0) {
      arr.push(zoom);
    }
    for (var i=0; i<arr.length; i++) {
      var menuitem = document.createElement('menuitem');
      var s = '    '+ (arr[i]).toString();
      menuitem.setAttribute('label',s.substr(s.length - 4, 4) + '%');
      menuitem.setAttribute('type','radio');
      menuitem.setAttribute('val', arr[i]);
      menuitem.setAttribute('useFullZoom', useFullZoom);
      menuitem.addEventListener("click", function(event){defaultfullzoomlevel_fullZoomBtn.doFullZoomBy(event.target.getAttribute("val")/100, event.target.getAttribute("useFullZoom") === "true");});
      if (!ZoomManager.getCurrentMode() == !useFullZoom &&
         arr[i] == Math.floor(ZoomManager.zoom * 100 + 0.5)) {
        menuitem.setAttribute('checked',true);
      }

      popup.appendChild(menuitem);
    }
    var bundle = document.getElementById("bundle_defaultfullzoomlevel");
    if (useFullZoom) {
      var menuitem = document.createElement('menuseparator');
      popup.appendChild(menuitem);

      var menuitem = document.createElement('menuitem');
      menuitem.setAttribute('label',bundle.getString('fitToWindow'));
      menuitem.setAttribute('useFullZoom', useFullZoom);
      menuitem.addEventListener('click',function(event){defaultfullzoomlevel_fullZoomBtn.doFullZoomBy(-1, event.target.getAttribute("useFullZoom") === "true", null, true);});
      menuitem.setAttribute('type','checkbox');

      if ( FullZoom.globalAuto && !!ZoomManager.useFullAuto) {
        menuitem.setAttribute('checked',true);
      }
      popup.appendChild(menuitem);
    }
    var menuitem = document.createElement('menuseparator');
    popup.appendChild(menuitem);

    var menuitem = document.createElement('menuitem');
    menuitem.setAttribute('label',bundle.getString('reset'));
    menuitem.setAttribute('value', FullZoom.globalValue);
    menuitem.setAttribute('useFullZoom',useFullZoom);
    menuitem.addEventListener('click',function(event){defaultfullzoomlevel_fullZoomBtn.doFullZoomBy(event.target.getAttribute("value"), event.target.getAttribute("useFullZoom") === "true");});
    menuitem.setAttribute('type','checkbox');
    popup.appendChild(menuitem);
  },

  //
  getPref: function(aPrefString, aPrefType, aDefault) {
    var xpPref = Components.classes['@mozilla.org/preferences-service;1']
                  .getService(Components.interfaces.nsIPrefService);
    try{
      switch (aPrefType) {
        case 'complex':
          return xpPref.getComplexValue(aPrefString, Components.interfaces.nsILocalFile); break;
        case 'str':
          return xpPref.getCharPref(aPrefString).toString(); break;
        case 'int':
          return xpPref.getIntPref(aPrefString); break;
        case 'bool':
        default:
          return xpPref.getBoolPref(aPrefString); break;
      }
    }catch(e) {
    }
    return aDefault;
  },
  //
  setPref: function(aPrefString, aPrefType, aValue) {
    var xpPref = Components.classes['@mozilla.org/preferences;1'].getService(Components.interfaces.nsIPrefBranch2);
    try{
      switch (aPrefType) {
        case 'complex':
          return xpPref.setComplexValue(aPrefString, Components.interfaces.nsILocalFile, aValue); break;
        case 'str':
          return xpPref.setCharPref(aPrefString, aValue); break;
        case 'int':
          aValue = parseInt(aValue);
          return xpPref.setIntPref(aPrefString, aValue);  break;
        case 'bool':
        default:
          return xpPref.setBoolPref(aPrefString, aValue); break;
      }
    }catch(e) {
    }
    return null;
  },

  debug: function(aMsg) {
    return;

    const Cc = Components.classes;
    const Ci = Components.interfaces;
    Cc["@mozilla.org/consoleservice;1"]
      .getService(Ci.nsIConsoleService)
      .logStringMessage("##### " +aMsg);
  }
};

//Initialize with new FullZoom
window.addEventListener("load", defaultfullzoomlevel_fullZoomBtn, false);
