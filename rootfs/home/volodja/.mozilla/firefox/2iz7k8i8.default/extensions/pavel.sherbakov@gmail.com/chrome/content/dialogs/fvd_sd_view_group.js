Components.utils.import("resource://fvd.speeddial.modules/settings.js");
Components.utils.import("resource://fvd.speeddial.modules/properties.js");

function onOK(){
		
	return true;
}

function setListType( type ){
	fvd_speed_dial_gFVDSSDSettings.setStringVal( "sd.view_group_type", type );
	viewType = type;
	
	buildList();
}

function _refreshBrowser(){
	return document.getElementById( "refresh_browser" );
}

function refreshProcessor(){
	if( refreshQueue.length == 0 ){
		return false;
	}
	
	if( refreshActive ){
		return false;
	}
	
	refreshActive = true;
	
	var url = refreshQueue.shift();
	
	var b = _refreshBrowser();

	
	b.addEventListener("load", refreshBrowserContentLoaded, true);        
	
	b.setAttribute( "src", url );
	
    b.docShell.allowJavascript = true;
   	b.docShell.allowPlugins = false;
    b.docShell.allowAuth = false;
    b.docShell.allowImages = false;	
}

function refreshBrowserContentLoaded(){
	_refreshBrowser().removeEventListener("load", refreshBrowserContentLoaded);      	
	_refreshBrowser().setAttribute( "src", "" );
	refreshActive = false;
	storage.invalidateMostVisitedCache();
	buildList();
}

function getElemByUrl( url ){
	var elements = document.getElementsByClassName( "snippet" );
	for( var i = 0; i != elements.length; i++ ){
		if( elements[i].getAttribute("url") == url ){
			return elements[i];
		}
	}
	
	return null;
}

function setLoadingForElement( elem, loading ){
	elem.setAttribute( "loading", loading );
}

function refreshUrl(){
	var elem = getElemByUrl( popupedUrl );
	
	setLoadingForElement( elem, 1 );
	
	refreshQueue.push( popupedUrl );
}

function buildList(){
	var urls = storage.getMostVisitedByDomain( interval, domain, fvd_speed_dial_gFVDSSDSettings.getStringVal("sd.most_visited_order") );
	var container = document.getElementById( "container" );
	
	while( container.firstChild ){
		container.removeChild( container.firstChild );
	}
	
	for( var i = 0; i != urls.length; i++ ){
		var snippet = document.getElementById("snippet").cloneNode( true );
		var favicon = snippet.getElementsByClassName( "favicon" )[0];
		var title = snippet.getElementsByClassName( "title" )[0];
		var viewsCount = snippet.getElementsByClassName( "views_count" )[0];
		
		snippet.removeAttribute("id");
		
		favicon.setAttribute( "src", urls[i].favicon );
		
		if( viewType == "uri" ){
			title.setAttribute( "value", urls[i].url );	
		}
		else if( viewType == "title" ){
			title.setAttribute( "value", urls[i].title );			
		}
		
		viewsCount.setAttribute( "value", urls[i].visits );
		
		snippet.setAttribute( "tooltiptext", urls[i].url );
		snippet.setAttribute( "url", urls[i].url );
		
		var url = urls[i].url;
		var title = urls[i].title;
		(function(snippet, url, title){
			snippet.onclick = function(event){
				if( event.button != 2 ){
					opener.fvd_speed_dial_speedDialSSD._navigate( url, event );				
				}
				else{
					popupedUrl = url;
					popupedTitle = title;
					popupedElem = snippet;
				}
			}
		})(snippet, url, title);
		
		if( refreshQueue.indexOf( url ) != -1 ){
			setLoadingForElement(snippet, 1);
		}
		
		container.appendChild( snippet );
	}
}

function addToSpeedDial(){
	opener.fvd_speed_dial_speedDialSSD.createNewDial( popupedUrl, popupedTitle );
}

function open( type ){
	opener.fvd_speed_dial_speedDialSSD._navigate( popupedUrl, null, null, type );		
}

function removePopuped(){
	opener.fvd_speed_dial_speedDialSSD.removeMostVisited( popupedUrl );
	buildList();
}

function block(){
	opener.fvd_speed_dial_speedDialSSD.denyUrl( popupedUrl );
}

function copyUrl(){
	opener.fvd_speed_dial_speedDialSSD._copyToClipboard( popupedUrl );
}

var storage;

var refreshQueue = [];
var refreshActive = false;

var interval = null;
var domain = null;
var viewType = null;
var popupedUrl = null;
var popupedTitle = null;
var popupedElem = null;

try{
	Components.utils.import("resource://fvd.speeddial.modules/storage.js");
    storage = fvd_speed_dial_Storage;			
}
catch( ex ){
	//dump( "Fail init storage\r\n" );	
}

window.onunload = function(){
	fvd_speed_dial_gFVDSSDSettings.setIntVal( "sd.view_group_window.width", window.innerWidth );
	fvd_speed_dial_gFVDSSDSettings.setIntVal( "sd.view_group_window.height", window.innerHeight );
}

window.onload = function(){
	var width = null;
	var height = null;
	try{
		width = fvd_speed_dial_gFVDSSDSettings.getIntVal( "sd.view_group_window.width" );
		height = fvd_speed_dial_gFVDSSDSettings.getIntVal( "sd.view_group_window.height" );
	}
	catch( ex ){
		
	}
	
	if( width && height ){
		window.innerWidth = width;
		window.innerHeight = height;
	}
	
	interval = window.arguments[0].wrappedJSObject.interval;
	domain = window.arguments[0].wrappedJSObject.domain;
	
	viewType = fvd_speed_dial_gFVDSSDSettings.getStringVal( "sd.view_group_type" );
	document.getElementById( "view_type" ).value = viewType;
	
	buildList();
}

window.addEventListener( "keypress", function(event){
	if( event.DOM_VK_ESCAPE == event.keyCode ){
		window.close();
	}
}, false );

setInterval( function(){
	refreshProcessor();
}, 100 );
