FvdSSDToolUrlRequestor = function( urls, callback ){
	
	this.urls = urls;
	this.callback = callback;
	this.errorCallback = null;
	 
	this.execute = function( urlIndex ){
		urlIndex = urlIndex || 0;
		 
		if( urlIndex >= this.urls.length ){
			return false;
		}
		var url = this.urls[ urlIndex ];		 
	
		 
        var ajax = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance(Components.interfaces.nsIXMLHttpRequest);
        ajax.open('GET', url, true);
        ajax.setRequestHeader('Cache-Control', 'no-cache');
        ajax.channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
		ajax.instance = this;
		
        ajax.onreadystatechange = function(){
			if( this.readyState == 4 ){
				if ((this.status == 200) && (this.responseText)) {
					
					if( typeof this.instance.callback == "function" ){
						this.instance.callback( this.responseText, this.status );
					}
					else{
						this.instance.callback["function"].call(this.instance.callback["instance"], this.responseText, this.status);
					}					
				}
				else{
					
					if( this.errorCallback ){
						if( typeof this.instance.errorCallback == "function" ){
							this.instance.errorCallback( this.responseText );
						}
						else{
							this.instance.errorCallback["function"].call(this.instance.errorCallback["instance"], this.responseText, this.status);
						}
					}
					
					this.instance.execute( urlIndex + 1 );
				}
			}
		};
        ajax.send(null);
	}
	
}
