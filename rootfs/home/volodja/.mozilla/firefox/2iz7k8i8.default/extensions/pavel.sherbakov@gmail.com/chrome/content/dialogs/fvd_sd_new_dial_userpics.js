var prompts = Components.classes['@mozilla.org/embedcomp/prompt-service;1'].getService(Components.interfaces.nsIPromptService);
Components.utils.import("resource://fvd.speeddial.modules/properties.js");
Components.utils.import("resource://fvd.speeddial.modules/misc.js");
Components.utils.import("resource://fvd.speeddial.modules/remoterequest.js");

resultCallback = null;

function getParameterByName(name) {
	
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    
}

var isShort = !!getParameterByName("short");

var Translater = new function(){
	
	var propertyFile = "dialogs/fvd_sd_new_dial_userpics";
	
	this._ = function(str){	
		return fvd_speed_dial_FVDSSDToolbarProperties.getString(propertyFile, str);		
	};
	
	this.translateDocument = function( doc ){
			
		var iterator = fvd_speed_dial_FVDSSDToolbarProperties.getIterator( propertyFile );
	
		var item = null;		
		while( iterator.hasMoreElements() ){
			var item = iterator.getNext();
			item = item.QueryInterface( Components.interfaces.nsIPropertyElement );
						
			var elements = doc.querySelectorAll( "[msg=\""+item.key+"\"]" );
						
			for( var i = 0; i != elements.length; i++ ){
				var el = elements[i];
				el.textContent = item.value;
			}
			
		}
		
	};
	
};

function _( str ){
	return Translater._( str );
}

var dlg = {
	close: function(){
	
	}
};

var PicsUserPics = fvd_speed_dial_RemoteRequest;
var PickUserPics = fvd_speed_dial_RemoteRequest;

const ADDITIONAL_SEARCH = [
	{
		title: "Google Images",
		url: "http://www.google.com/search?hl=en&site=imghp&tbm=isch&source=hp&q={simplehost}"
	},
	{
		title: "Icon Finder",
		url: " https://www.iconfinder.com/search/?q={simplehost}+icon"
	},
	{
		title: "Find Icons",
		url: "http://findicons.com/search/{simplehost}"
	},
	{
		title: "Icon Archive",
		url: "http://www.iconarchive.com/search?q={simplehost}"
	},
	{
		title: "Icons Pedia",
		url: "http://www.iconspedia.com/search/{simplehost}/"
	},
	
];

PickUserPicsBuilder = {
	
	currentPage: 0,
	currentOrder: "best",
	currentTotalPages: 0,
	currentHost: "",
	
	_showAdditionalSearch: function( found ){
		if( isShort ){
			return;
		}
		
		var that = this;
		
		var container = document.querySelector("#dialogPicUserPics .picsContainer");
		
		if( !found ){
				
			var notFoundElem = document.createElement("div");
											
			notFoundElem.className = "notFound";
			notFoundElem.textContent = _("items_not_found");
			container.appendChild( notFoundElem );	
				
		}		
			
		var additionalSearch = document.createElement("div");
		additionalSearch.className = "additionalSearch";
				
		var title = document.createElement("div");
		title.textContent = _("items_not_found_title").replace("{host}", this.currentHost);
		title.className = "title";
				
		additionalSearch.appendChild( title );
		
		var tmp = this.currentHost.split(".");

		var hostSimple = this.currentHost;
		
		if( tmp.length >= 2 ){
			hostSimple = tmp[ tmp.length - 2 ];
			if( hostSimple == "co" && tmp.length > 2 ){
				hostSimple = tmp[ tmp.length - 3 ];
			}
		}
		

		ADDITIONAL_SEARCH.forEach(function( item ){
			
			var elem = document.createElement("div");
	
			var a = document.createElement("a");
			a.textContent = item.title;
			a.setAttribute("href", item.url.replace("{host}", that.currentHost).replace("{simplehost}", hostSimple));
			a.setAttribute("target", "_blank");
			
			elem.appendChild( a );
			
			additionalSearch.appendChild( elem );
			
		});
		
		container.appendChild( additionalSearch );		

		var additionalHelpMessage = document.createElement("div");
		additionalHelpMessage.className = "additionalHelpMessage";
		var text = document.createElement( "span" );
		text.textContent = _("dialog_pick_user_pics_not_found_enter_in");
		
		additionalHelpMessage.appendChild( text );
		var img = document.createElement("div");
		img.className = "img";
		
		additionalHelpMessage.appendChild( img );
		
		container.appendChild( additionalHelpMessage );
	},
	
	setOrder: function( order, callback ){
		
		if( PickUserPics.currentXHR.length > 0 ){
			PickUserPics.currentXHR.forEach(function( xhr ){
				xhr.abort();
			});
			
			PickUserPics.currentXHR = [];
		}
		
		this.currentOrder = order;
		this.currentPage = 0;
		
		var container = document.querySelector("#dialogPicUserPics .picsContainer");				
		var elems = document.querySelectorAll( "#dialogPicUserPics .head .order" );
		
		while( container.firstChild ){
			container.removeChild( container.firstChild );
		}
		
		for( var i = 0; i != elems.length; i++ ){
			var el = elems[i];
			el.removeAttribute("active");
		}
		
		document.querySelector( "#dialogPicUserPics .head .order." + order ).setAttribute("active", 1);
		
		this.buildList( null, callback );		
		
	},
	
	buildList: function( params, callback ){
		
		var that = this;
		
		var container = document.querySelector("#dialogPicUserPics .picsContainer");
		
		if( container.querySelector("div.loading") ){
			return;
		}
		
		var loading = document.createElement("div");
		loading.className = "loading";
		
		container.appendChild( loading );
		
		var on_page = null;
		
		if( isShort ){
			on_page = 10;
		}
				
		PickUserPics.listImages( this.currentHost, this.currentPage, this.currentOrder, function( error, data ){
			
			if( error ){
				prompts.alert( window, _( "alert.fail_fetch_userpics.title" ),
					_( "alert.fail_fetch_userpics.text" ) );
				return;
			}
			
			that.currentTotalPages = data.totalPages;
			
			container.removeChild( loading );
			
			if( data.previews.length == 0 ){
				/*
				var notFoundElem = document.createElement("div");
				notFoundElem.className = "notfound";
				notFoundElem.textContent = _("items_not_found");
				container.appendChild( notFoundElem );
				*/
				
				that._showAdditionalSearch();
			}			
						
			data.previews.forEach(function( preview ){
				
				var previewElem = document.createElement( "div" );
				previewElem.className = "item";
				
				var img = document.createElement("div");
				img.className = "preview";
//						img.setAttribute("src", preview.url);

				img.style.background = "url(\""+preview.url+"\") no-repeat center center ";
				img.style.backgroundSize = "contain";
				
				var report = document.createElement("div");
				report.className = "report";
				report.setAttribute("title", _("dialog_pick_user_pics_report"));
				
				if( !isShort ){
					previewElem.appendChild( report );	
				}
												
				var reportContainer = document.createElement("div");
				reportContainer.className = "reportContainer";
				var buttonInappropriate = document.createElement("button");
				var buttonDuplicate = document.createElement("button");						
				
				buttonInappropriate.className = "fvdButton inappropriate";
				buttonDuplicate.className = "fvdButton duplicate";							
				buttonInappropriate.textContent = _("dialog_pick_user_pics_report_innop");
				buttonDuplicate.textContent = _("dialog_pick_user_pics_report_duplicate");
				
				var closeReport = document.createElement("div");
				closeReport.className = "close";
				
				reportContainer.appendChild( buttonInappropriate );
				//reportContainer.appendChild( buttonDuplicate );						
				reportContainer.appendChild( closeReport );							
				
				var thankYouReport = document.createElement("div");
				thankYouReport.textContent = _("dialog_pick_user_pics_report_thanks");
				thankYouReport.className = "thanks";
				
				reportContainer.appendChild( thankYouReport );
										
				previewElem.appendChild( img );
				previewElem.appendChild( reportContainer );
				container.appendChild( previewElem );
				
				closeReport.addEventListener( "click", function( event ){							
					previewElem.removeAttribute("report");				
					
					event.stopPropagation();			
				}, false );
				report.addEventListener( "click", function( event ){		
					previewElem.setAttribute("report", 1);							

					event.stopPropagation();							
				}, false );
				
				previewElem.addEventListener( "click", function(){

					resultCallback( preview );		
					resultCallback = null;	
																
					dlg.close();
					
				}, false );
				
				function _okReport(){
					setTimeout(function(){
						
						previewElem.removeAttribute("report");	
						
						setTimeout(function(){
							reportContainer.removeAttribute( "thanks" );
						}, 500);
						
					}, 1000);
				}
				
				reportContainer.addEventListener( "click", function( event ){
					
					event.stopPropagation();
					
				}, false );
				buttonInappropriate.addEventListener( "click", function(){
												
					PickUserPics.report( preview.id, "inappropriate", function(){
						reportContainer.setAttribute( "thanks", 1 );
						_okReport();
					} );							
					
				}, false );						
				buttonDuplicate.addEventListener( "click", function(){
					PickUserPics.report( preview.id, "duplicate", function(){
						reportContainer.setAttribute( "thanks", 1 );
						_okReport();
					} );					
				}, false );
				
				setTimeout(function(){
					
					previewElem.setAttribute("appear", 1);
					
				}, 0);
				
			});
						
			if( that.currentTotalPages - 1 == that.currentPage  ){
				that._showAdditionalSearch(true);
			}	
						
			if( callback ){
				callback( data.previews );
			}
			
		}, on_page );
		
	}
	
};

function display( host, callback ){
	
	try{
		
		PickUserPicsBuilder.currentHost = host;
		PickUserPicsBuilder.setOrder( "best", callback );
		
	}
	catch( ex ){
		dump( ex + "\n" );
	}
	
}

function cancelAllRequests(){
	fvd_speed_dial_RemoteRequest.cancelAllRequests();
}

window.addEventListener( "load", function(){
	
	Translater.translateDocument( document );
	
	var container = document.querySelector("#dialogPicUserPics .picsContainer");
	
	if( isShort ){
		
		document.getElementById("dialogPicUserPics").setAttribute("short", 1);
		
		document.querySelector(".showMoreContainer a").addEventListener( "click", function(){
			
			parent.setDialogMode( "userpics" );
			
		}, false );
		
	}
	else{
		container.addEventListener( "scroll", function(){
			
			var remainScroll = container.scrollHeight - container.scrollTop - container.offsetHeight;
			
			if( remainScroll < 50 && PickUserPicsBuilder.currentPage < PickUserPicsBuilder.currentTotalPages - 1 ){
				PickUserPicsBuilder.currentPage++;
				PickUserPicsBuilder.buildList();
			}
			
		}, false );
	}

	
}, false );
