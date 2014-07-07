var LiveSearch = new function(){
	
	const URL = "http://flashvideodownloader.org/addon_search/?type=instant_search&from=ff_fvdsd&q=%query%";
	
	const HIDE_ELEMENTS = [
		// surf canyon
		".search-bar",
		".other-media-links",
		".search-results",
		".right-content",
		".moreResults",
		".footer-search",
		".footer",
		".left",
		".container-table .middle > p",
	
		".search_header",
		".topsearchdiv",
		".search_numberpager",
		".search_footer",
		"#footer",
		"#mngb",
		"#top_nav",
		"#appbar",
		"#extrares",
		"#foot",
		"#rhscol",
		
		
		"#hd-wrap",
		"#horiz_tabs",
		"#sidebar",
		"#atat",
		".ads.horiz.bot",
		"#satat",
		"#pg",
		".bdc",
		"#ft",
		"#cnt-wrap",
		"#east",
		".reducepx-spnshd.left-ad"				
	];
	
	const INSERT_CSS = '\
	.search_results_item_title{\
		font-size: 13px;\
	}\
	body{\
		font-size: 12px;\
	}\
	.search_results_item_link{\
		padding-bottom: 0px;\
	}\
	.search_header + table td{\
		white-space: nowrap;\
	}\
	.search_title_right{\
		width: auto;\
		min-width: 50%;\
	}\
	#center_col{\
		margin-left: 0px !important;\
	}\
	.vspib{\
		display: none !important;\
	}\
	\
	#results{\
		margin-left: 0px !important;\
	}\
	#bd{\
		width: auto !important;\
	}\
	#web{\
		width: auto !important;\
	}\
	#main{\
		margin-right: 10px !important;\
	}\
	.sub{\
		display: none !important;\
	}\
	body#ysch{\
		overflow:hidden;\
	}\
	';
	
	const MIN_QUERY_SIZE = 3;
	
	var _frameCurrentLocation = null;	
	var __showTimeout = null;
	var __hideTimeout = null;
	var _locationChangeCallback = null;
	var _showHideDialsTimeout = null;
	
	var container = null;
	var stack = null;
	
	var _isSearchOnGoogle = false;

	var prefsListener = new function(){
		
		var self = this;
		
		var prefsToHide = [
			"sd.last_opened_group",
			"sd.most_visited_interval",
			"sd.display_type_last_selected"
		];
		
		fvd_speed_dial_gFVDSSDSettings.addObserver( self );		
		
		window.addEventListener( "unload", function(){
			
			fvd_speed_dial_gFVDSSDSettings.removeObserver( self );	
			
		}, false );
		
    	this.observe = function(aSubject, aTopic, aData){
		
	        try {
				switch (aTopic) {
					case 'nsPref:changed':
					
						if( prefsToHide.indexOf( aData ) != -1 ){
							hideLiveSearch();
						}
					
						break;
				}
			}
			catch( ex ){

			}
			
		}
		
	}
	
	var frameProgressListener = new function(){
		
        this.QueryInterface = function(aIID){
            if (aIID.equals(Components.interfaces.nsIWebProgressListener) || aIID.equals(Components.interfaces.nsISupportsWeakReference) || aIID.equals(Components.interfaces.nsISupports)) 
                return this;
            throw Components.results.NS_NOINTERFACE;
        }
		
		this.onLocationChange = function(){

			
			
		}
		this.onProgressChange = function(){}
		this.onSecurityChange = function(){}
		this.onStatusChange = function( aWebProgress, aRequest, aStatus, aMessage ){
			
		}						
		
		this.onStateChange = function( aWebProgress, aRequest, aStateFlags, aStatus ){
					
			if( ((0x00020000 & aStateFlags) > 0) && _frameCurrentLocation != getFrame().contentDocument.location.href ){				
				_frameCurrentLocation = getFrame().contentDocument.location.href;
				if( _locationChangeCallback ){
					_locationChangeCallback();
				}
			}
			
		}
		
	}
	
	function _emptyAnimationTimeouts(){
		
		if( __showTimeout ){
			clearTimeout(__showTimeout);
			__showTimeout = null;
		}
		
		if( __hideTimeout ){
			clearTimeout(__hideTimeout);
			__hideTimeout = null;
		}
		
	}
	
	function getInput(){
		return document.getElementById("q");
	}
	
	function currText(){
		return getInput().value;
	}
	
	function getFrame(){
		return document.querySelector( "#liveSearch browser" );
	}
	
	function _documentKeyPressListener( event ){
			
		if( event.keyCode == 27 ){
			hideLiveSearch();
		}
		
	}
	
	function _documentClickListener( event ){
				
		if( getInput().hasAttribute("autocompletedisplayed") ){
			return;
		}
		
		var panel = document.getElementById("searchAutocompletePanel");
		
		var item = event.target;
		var ls = document.getElementById("liveSearch");
		
		while( true ){
			
			if( item == ls ){
				return;
			}
			
			item = item.parentNode;
			if( !item ){
				break;
			}
			
		}
		
		hideLiveSearch();
		
	}
	
	function refreshLiveSearchPosition( params ){
		
		params = params || {};
		
		var input = getInput();
		var panel = document.getElementById("searchAutocompletePanel");
		
		if( typeof params.autocompletedisplayed == "undefined" ){
			params.autocompletedisplayed = input.hasAttribute("autocompletedisplayed");
		}		
		
		var inputRect = input.getBoundingClientRect(); 
				
		var top = inputRect.top + inputRect.height;
		if( params.autocompletedisplayed ){
			inputRect = panel.getBoundingClientRect(); 
			
			top = inputRect.top + inputRect.height;
		}
		
		container.style.marginTop = 10 + top + "px";
		
	}
	
	function showLiveSearch(){
		

		stack.setAttribute("flex", 2);
		
		if( _showHideDialsTimeout ){
			clearTimeout( _showHideDialsTimeout );
		}
		
		document.addEventListener( "keypress", _documentKeyPressListener, false );
		document.addEventListener( "click", _documentClickListener, false );		
		
		document.getElementById("speedDialPayload").setAttribute("hidden", true);
		document.getElementById("speedDialPayload").style.opacity = 0;	
		document.getElementById("expandMessageParent").setAttribute("hide", 1);
		
		var frame = getFrame();
		
		var url = URL.replace( "%query%", encodeURIComponent( currText() ) );	
		
		if( url == frame.currentURI.spec ){
			return;
		}
		
		container.querySelector(".content").setAttribute("loading", 1);
		
		if( _isSearchOnGoogle ){
			container.querySelector(".head label").setAttribute("value", "Instant Search - " + currText());
		}
		else{
			//container.querySelector(".head label").setAttribute("value", "Powered by Yahoo Search - " + currText());			
			container.querySelector(".head label").setAttribute("value", "Powered by Surfcanyon.com - " + currText());
		}
		
		frame.style.opacity = 0;
		
		frame.onload = function(){
			
			frame.style.opacity = 1;
			
			var doc = frame.contentDocument;				
			
			if( doc.location.host.toLowerCase().indexOf("google.com") != -1 ) {
				_isSearchOnGoogle = true;
				
				container.querySelector(".head label").setAttribute("value", "Instant Search - " + currText());
			}			
					
			doc.body.style.overflowX = "hidden";
			//doc.documentElement.scrollTop = 130;	
			
			// set base target to _blank
			var base = doc.createElement("base");
			base.setAttribute("target", "_top");
			doc.head.appendChild( base );
			
			HIDE_ELEMENTS.forEach(function( selector ){
				var elems = doc.querySelectorAll(selector);
				for( var i = 0; i != elems.length; i++ ){
					elems[i].style.display = "none";
				}
			});
			
			var styleElem = doc.createElement( "style" );
			styleElem.textContent = INSERT_CSS;
			doc.body.appendChild( styleElem );
			
			container.querySelector(".content").removeAttribute("loading");			
					
		}
	
		frame.loadURI(url, null, null);	
		// load without JS
		frame.docShell.allowJavascript = false;
		
		if( !container.hasAttribute("invisible") ){
			return;
		}	
		
		_emptyAnimationTimeouts();
		
		container.removeAttribute("invisible", 1);
		
		container.style.opacity = 0;
		container.style.transition = "opacity ease 500ms";
		container.removeAttribute("hidden");
		
		__showTimeout = setTimeout(function(){
			container.style.opacity = 1;
			
			__showTimeout = setTimeout(function(){
						
				container.style.transition = "";
			}, 500);				
		}, 0);
		
		refreshLiveSearchPosition();
		
	}
	
	function hideLiveSearch(){	
		
		stack.setAttribute("flex", 0);
				
		document.removeEventListener( "keypress", _documentKeyPressListener );
		document.removeEventListener( "click", _documentClickListener );
	
		if( _showHideDialsTimeout ){
			clearTimeout( _showHideDialsTimeout );
		}
		
		_showHideDialsTimeout = setTimeout(function(){
			
			document.getElementById("speedDialPayload").removeAttribute("hidden", true);
						
			setTimeout( function(){
				document.getElementById("expandMessageParent").setAttribute("hide", 0);
			}, 500 );
											
			setTimeout(function(){
				document.getElementById("speedDialPayload").style.opacity = 1;							
			}, 50);						
			
		}, 300);
			
		container.querySelector(".content").removeAttribute("loading");
			
		if( container.hasAttribute("invisible") ){
			return;
		}	
		
		_emptyAnimationTimeouts();
			
		container.setAttribute("invisible", 1);
			
		container.style.transition = "opacity ease 500ms";
		
		__hideTimeout = setTimeout(function(){
			container.style.opacity = 0;			
						
			__hideTimeout = setTimeout(function(){
				container.style.transition = "";
				container.setAttribute("hidden", true);
			}, 500);				
		}, 0);
		
	}
	
	function init(){		
			
		if( fvd_speed_dial_Misc.isLangInList("ru") ){
			return; // ignore live search
		}
		
		if( !fvd_speed_dial_gFVDSSDSettings.getBoolVal( "sd.display_search_preview" ) ){
			return;
		}
		
		var panel = document.getElementById("searchAutocompletePanel");
		
		panel.addEventListener( "click", function( event ){
			
			event.stopPropagation();
			
		}, false );
		
		panel.addEventListener("popupshown", function(){

			getInput().removeAttribute( "canapplyautocomplete" );
			getInput().setAttribute("autocompletedisplayed", true);
			
			refreshLiveSearchPosition();
			
		}, false);

		panel.addEventListener("popuphidden", function(){			
			
			getInput().removeAttribute( "canapplyautocomplete" );		
			
			setTimeout(function(){
				
				getInput().removeAttribute("autocompletedisplayed");
				
			}, 500);
			
			refreshLiveSearchPosition({
				autocompletedisplayed: false
			});
			
		}, false);		
		
		panel.addEventListener( "select", function( event ){				
			
			if( !getInput().hasAttribute( "canapplyautocomplete" ) ){
				return;
			}
			
			getInput().removeAttribute( "canapplyautocomplete" );
			
			try{
						
				var tree = panel.tree;
				//dump(tree.currentIndex + ": " +panel.view.getCellText( tree.currentIndex, tree.columns.getFirstColumn() )+ "\n");				
				//alert( panel.treecols.children[0].QueryInterface(Components.interfaces.nsITreeColumn) );
				//alert( panel.view.getCellText( 1, tree.columns.getFirstColumn() ) );			
				
				if( tree.currentIndex >= 0 ){
					
					getInput().value = panel.view.getCellText( tree.currentIndex, tree.columns.getFirstColumn() );	
					showLiveSearch();
					
				}
				
			}
			catch( ex ){
			//	alert(ex);			
			}

		}, false );
		
		getInput().addEventListener("keydown", function( event ){
				
			if( event.keyCode == 27 ){
				return;
			}	
				
			if( [ 40, 38 ].indexOf( event.keyCode ) != -1 ){
				getInput().setAttribute( "canapplyautocomplete", true );				
			}
			
		});
			
		function _inputTextListener( event ){
			
			if( event.keyCode == 27 ){
				return;
			}
			
			setTimeout(function(){
				
				var text = currText();
	
				if( text.length >= MIN_QUERY_SIZE ){					
					showLiveSearch();
				}
				else{
					hideLiveSearch();
				}
				
			}, 0);	
			
		}
		
		getInput().addEventListener("keypress", _inputTextListener, false);
		getInput().addEventListener("input", _inputTextListener, false);
		
		container = document.getElementById( "liveSearchContainer" );
		
		try{
			getFrame().addProgressListener( frameProgressListener );	
			_frameCurrentLocation = getFrame().contentDocument.location.href;
		}
		catch( ex ){
			dump( ex + "\n" );		
		}
		
		container.querySelector(".head .close").addEventListener("click", function(){
			
			hideLiveSearch();
			
		}, false);		
		
		stack = document.getElementById("searchSDStack");
		
		//prevent mousedown events to prevent scrolling
		document.getElementById("liveSearch").addEventListener("mousedown", function( event ){
			event.stopPropagation();
			event.preventDefault();
		}, false);
		
	}
	
	window.addEventListener("load", function(){			
		
		init();
		
	});
	
}
