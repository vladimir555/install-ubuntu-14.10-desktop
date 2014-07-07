var EXPORTED_SYMBOLS = ["fvd_sd_PremiumForShare"];

Components.utils.import("resource://fvd.speeddial.modules/settings.js");
Components.utils.import("resource://fvd.speeddial.modules/sync.js");

var fvd_sd_PremiumForShare = {
  allowShow: function(params, callback) {
    if(typeof params == "function") {
      callback = params;
      params = {};
    }
        
    if(!params.ignoreDisplayed && fvd_speed_dial_gFVDSSDSettings.getBoolVal("premium_for_share_displayed")){
      return;
    }
    
    function isAuthorizedOnServer(cb) {
      var xhr = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
      xhr.open("GET", "https://everhelper.me/shareforpremium/can.php");
      xhr.onload = function() {
        try{
          var resp = JSON.parse(xhr.responseText);  
        }
        catch(ex){
          return cb(false); 
        }        
        if(!resp.can){
          cb(false);
        }
        else{
          cb(true);
        }
      };
      xhr.send();
    }
    
    var installTime = parseInt(fvd_speed_dial_gFVDSSDSettings.getStringVal("install_date"));
    
    if(new Date().getTime() - installTime >= 3600 * 24 * 7 * 1000) {  
      if(fvd_speed_dial_Sync.fvdSynchronizerAvailable()) {
  
        isAuthorizedOnServer(function(authorized) {
          if(!authorized){
            return callback(false);
          }
          
          callback(true);
        });
        
      };
    }
  }
};
