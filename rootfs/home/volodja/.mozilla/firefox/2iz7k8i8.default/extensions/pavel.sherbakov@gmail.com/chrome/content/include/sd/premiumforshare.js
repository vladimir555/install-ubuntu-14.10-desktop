Components.utils.import("resource://fvd.speeddial.modules/premiumforshare.js");

HtmlSearch.onSetup.push(function() {  
  function show(forceShow){
    var shareOverlay = document.getElementById("premiumforshareOverflay");
    var iframe = shareOverlay.querySelector("iframe");
    shareOverlay.style.display = "block";
    if(!forceShow) {
      shareOverlay.setAttribute("hidden", 1);
    }
    else{
      shareOverlay.setAttribute("appear", 1);
    }
    setTimeout(function(){            
      iframe.setAttribute("src", "https://everhelper.me/shareforpremium/?url="+encodeURIComponent("https://addons.mozilla.org/en-US/firefox/addon/fvd-speed-dial/")); 
      
      iframe.addEventListener("load", function _frameLoad(){
        iframe.removeEventListener("load", _frameLoad);
        shareOverlay.removeAttribute("hidden", 1);
        setTimeout(function(){
          shareOverlay.setAttribute("appear", 1);
        }, 0);              
        
        var closeEls = iframe.contentDocument.querySelectorAll("#mainDialog .close");
        for(var i = 0; i != closeEls.length; i++) {
          closeEls[i].addEventListener("click", function(){
            HtmlSearch.settings().setBoolVal("premium_for_share_displayed", true);
            shareOverlay.setAttribute("appear", 0);
            setTimeout(function(){
              shareOverlay.style.display = "none";
            }, 200);  
          }, false);
        }
        
      }, false);
    }, 0);  
  }
  
  if(document.location.hash == "#share-for-premium") {    
    show(true);
  }
  else{
    fvd_sd_PremiumForShare.allowShow(function(allow) {
      if(!allow){
        return;
      }    
      setTimeout(function(){
        show();
      }, 1000);    
    });
  }
      
});
