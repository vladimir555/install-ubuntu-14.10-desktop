const Ci = Components.interfaces;

const CLASS_ID = Components.ID("{d908872d-f46e-4208-a40d-46a008ae44b1}");
const CLASS_NAME = "AutoCompletePlus";
const CONTRACT_ID = "@mozilla.org/autocomplete/search;1?name=fvd_speed_dial_googleautocomplete";

function AutoCompletePlusResult(searchString, searchResult, defaultIndex, errorDescription, results, comments){
    this._searchString = searchString;
    this._searchResult = searchResult;
    this._defaultIndex = defaultIndex;
    this._errorDescription = errorDescription;
    this._results = results;
    this._comments = comments;
}

AutoCompletePlusResult.prototype = {
    _searchString: "",
    _searchResult: 0,
    _defaultIndex: 0,
    _errorDescription: "",
    _results: [],
    _comments: [],
    
     /**
     * The original search string
     */
    get searchString(){
        return this._searchString;
    },
    
     /**
     * The result code of this result object, either:
     *         RESULT_IGNORED   (invalid searchString)
     *         RESULT_FAILURE   (failure)
     *         RESULT_NOMATCH   (no matches found)
     *         RESULT_SUCCESS   (matches found)
     */
    get searchResult(){
        return this._searchResult;
    },
    
     /**
     * Index of the default item that should be entered if none is selected
     */
    get defaultIndex(){
        return this._defaultIndex;
    },
    
     /**
     * A string describing the cause of a search failure
     */
    get errorDescription(){
        return this._errorDescription;
    },
    
     /**
     * The number of matches
     */
    get matchCount(){
        return this._results.length;
    },
    
    /**
     * Get the value of the result at the given index
     */
    getValueAt: function(index){
        return this._results[index];
    },
    
	getLabelAt: function(index) {
		 return this._results[index];
	},
	
    /**
     * Get the comment of the result at the given index
     */
    getCommentAt: function(index){
        return this._comments[index];
    },
    
    /**
     * Get the style hint for the result at the given index
     */
    getStyleAt: function(index){
        //if (!this._comments[index]) 
        //    return null; // not a category label, so no special styling
        if (index == 0) 
            return "suggestfirst"; // category label on first line of results
          
        return "suggesthint"; // category label on any other line of results
    },
    
    /**
     * Get the image for the result at the given index
     * The return value is expected to be an URI to the image to display
     */
    getImageAt: function(index){
        return "";
    },
    
    /**
     * Remove the value at the given index from the autocomplete results.
     * If removeFromDb is set to true, the value should be removed from
     * persistent storage as well.
     */
    removeValueAt: function(index, removeFromDb){
        this._results.splice(index, 1);
        this._comments.splice(index, 1);
    },
    
    QueryInterface: function(aIID){
        if (!aIID.equals(Ci.nsIAutoCompleteResult) && !aIID.equals(Ci.nsISupports)) 
            throw Components.results.NS_ERROR_NO_INTERFACE;
        return this;
    }
};


// Implements nsIAutoCompleteSearch
function AutoCompletePlusSearch(){
	globalSearch = this;
}

AutoCompletePlusSearch.prototype = {
    /*
     * Search for a given string and notify a listener (either synchronously
     * or asynchronously) of the result
     *
     * @param searchString - The string to search for
     * @param searchParam - An extra parameter
     * @param previousResult - A previous result to use for faster searchinig
     * @param listener - A listener to notify when the search is complete
     */
	
	ajaxRequest: null,
	
    startSearch: function(searchString, searchParam, result, listener){
        // This autocomplete source assumes the developer attached a JSON string
        // to the the "autocompletesearchparam" attribute or "searchParam" property
        // of the <textbox> element. The JSON is converted into an array and used
        // as the source of match data. Any values that match the search string
        // are moved into temporary arrays and passed to the AutoCompleteResult
			
		globalSearch.getUrl( "http://google.com/complete/search?output=toolbar&q="+encodeURIComponent(searchString), function(){
			
			if (this.readyState == 4) {
				
				var data = {
					items: []
				};
				
				if ((this.status == 200)) {
					try{
						
					 	var r = this.responseXML;
						if( r ){
							var elems = r.getElementsByTagName( "suggestion" );
							for( var i = 0; i != elems.length; i++ ){
								data.items.push( elems[i].getAttribute("data") );
							}									
						}
					
					}
					catch(ex){
						dump( "Exception while parse suggestion list " + ex + "("+data.items+")\n" );
					}
					
					var newResult = new AutoCompletePlusResult(searchString, Ci.nsIAutoCompleteResult.RESULT_SUCCESS, 0, "", data.items, data.items);
    				listener.onSearchResult(globalSearch, newResult);
				}
			}

		} );


    },
	
	fillResult: function(){

	},
    
   	getUrl: function(url, callback){

		
        var ajax = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance(Components.interfaces.nsIXMLHttpRequest);
		this.ajaxRequest = ajax;
        ajax.open('GET', url, true);
        ajax.setRequestHeader('Cache-Control', 'no-cache');
        ajax.channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
        ajax.onreadystatechange = callback;
        ajax.send(null);
    },
	
    /*
     * Stop an asynchronous search that is in progress
     */
    stopSearch: function(){
		try{
			if( this.ajaxRequest ){
				this.ajaxRequest.abort();
			}
		}
		catch(ex){}
    },
    
    QueryInterface: function(aIID){
        if (!aIID.equals(Ci.nsIAutoCompleteSearch) && !aIID.equals(Ci.nsISupports)) 
            throw Components.results.NS_ERROR_NO_INTERFACE;
        return this;
    }
};

// Factory
var AutoCompletePlusSearchFactory = {
    singleton: null,
    createInstance: function(aOuter, aIID){
        if (aOuter != null) 
            throw Components.results.NS_ERROR_NO_AGGREGATION;
        if (this.singleton == null) 
            this.singleton = new AutoCompletePlusSearch();
		
        return this.singleton.QueryInterface(aIID);
    }
};

// Module
var AutoCompletePlusSearchModule = {
    registerSelf: function(aCompMgr, aFileSpec, aLocation, aType){
        aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
        aCompMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, CONTRACT_ID, aFileSpec, aLocation, aType);
    },
    
    unregisterSelf: function(aCompMgr, aLocation, aType){
        aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
        aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);
    },
    
    getClassObject: function(aCompMgr, aCID, aIID){
		
        if (!aIID.equals(Components.interfaces.nsIFactory)) 
            throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
        
        if (aCID.equals(CLASS_ID)){
            return AutoCompletePlusSearchFactory;			
		}


        throw Components.results.NS_ERROR_NO_INTERFACE;
    },
    
    canUnload: function(aCompMgr){
        return true;
    }
};

// Module initialization
function NSGetModule(aCompMgr, aFileSpec){
    return AutoCompletePlusSearchModule;
}

function NSGetFactory(){	
    return AutoCompletePlusSearchFactory;
};

