Components.utils.import("resource://fvd.speeddial.modules/settings.js");
Components.utils.import("resource://fvd.speeddial.modules/screen_maker.js");
Components.utils.import("resource://fvd.speeddial.modules/properties.js");
Components.utils.import("resource://fvd.speeddial.modules/misc.js");
Components.utils.import("resource://fvd.speeddial.modules/async.js");
Components.utils.import("resource://fvd.speeddial.modules/remoterequest.js");

function toContent(){
	setTimeout( function(){
		window.sizeToContent();
	}, 0 );
}

var prompts = Components.classes['@mozilla.org/embedcomp/prompt-service;1'].getService(Components.interfaces.nsIPromptService);

const DEFAULT_DIAL_BG = "-moz-linear-gradient(top, #fff, #e0e0e0)";
const DIALOG_WIDTH = 400;
const DIALOG_HEIGHT = 460;

// compatibility with ff3
if( opener.wrappedJSObject ){
	opener = opener.wrappedJSObject;
}

var storage;
var isModifyRequest = false;

if( typeof window.arguments[0].modify != "undefined" ){
	isModifyRequest = window.arguments[0].modify;		
}

var gFVDSSD = null;
var handChangedTitle = 0;
var dialog;
var currentTab = null;
var speedDialSSD = opener.fvd_speed_dial_speedDialSSD;
var fvd_speed_dial_speedDialSSD = speedDialSSD; // compatible with page grabber


var disables = {};

var _oldThumbUrl = null;

var initData = {};
var forceModifyPreviewData = false;

var windowMovedByUser = false;

var adjustedWindowX, adjustedWindowY;

try{
	Components.utils.import("resource://fvd.speeddial.modules/storage.js");
    storage = fvd_speed_dial_Storage;	
}
catch( ex ){
	//dump( "Fail init storage\r\n" );	
}

var urlImagesCache = [];
var sdPreviewItem = null;

function getAllButtons(){
	var buttons = [];
	var dialog = document.getElementsByTagName("dialog")[0];
	
	buttons.push(dialog.getButton("accept"));
	buttons.push(dialog.getButton("extra1"));
	buttons.push(dialog.getButton("cancel"));	
	
	return buttons;
}

function getDialogMode(){
	
	var dialog = document.getElementsByTagName("dialog")[0];
	
	return dialog.getAttribute( "fvdsdmode" );
	
}

function setDialogMode( newMode ){
	
	var allow = true;
		
	var initFuncName = "initMode_" + newMode;
	
	if( window[ initFuncName ] ){
		allow = window[ initFuncName ]();
	}
	
	if( !allow ){
		return;
	}
	
	var dialog = document.getElementsByTagName("dialog")[0];
	dialog.setAttribute( "fvdsdmode", newMode );
			
	window.sizeToContent();
	
}

function userPicsFrame(){
	var iframe = document.querySelector("#fvdsdmode_userpics iframe").contentWindow;		
	return iframe;
}

function userPicsResultCallback( item ){
	
	sdPreviewItem = item;
	
	document.getElementById( "preview_type" ).value = "force_url";					
	setScreenType('force_url');
	
	var tabs = document.getElementById( "tabsContainer" );

	tabs.selectedIndex = 1;
	
	document.getElementById("screen_url").value = item.url;
	preview(null, null, null, true);
	
}

function initMode_userpics(){
	
	var url = document.getElementById("url").value;	
	
	if( !/^https?:\/\//i.test(url) ){
		url = "http://" + url;
	}
	
	var host = fvd_speed_dial_Misc.parseUrl( url, "host" );
		
	if( !host ){
		incorrectUrlAlert();
		return false;
	}
	
	var buttons = getAllButtons();
	
	buttons.forEach( function( btn ){	
		if( btn.dlgType != "cancel" ){
			btn.setAttribute("hidden", true);			
		}	
	} );
	
	var iframe = userPicsFrame();
	iframe.display( host );
	
	iframe.resultCallback = function( item ){
		userPicsResultCallback( item );
		
		setDialogMode( "add" );
	};
	
	return true;
	
}

function initMode_add(){
	
	var buttons = getAllButtons();
	
	buttons.forEach( function( btn ){	
		if( btn.dlgType != "cancel" ){
			btn.removeAttribute("hidden");			
		}	
	} );
	
	return true;
	
}

function urlImageFromCache( js, plugins, delay, url ){
	var key = js + plugins + delay + url;
	if( urlImagesCache[ key ] ){
		return urlImagesCache[ key ];
	}
	
	return null;
}

function setUrlImageCache( js, plugins, delay, url, imageUrl ){
	var key = js + plugins + delay + url;
	urlImagesCache[ key ] = imageUrl;
}

function incorrectUrlAlert(){
	try{
		var bundle = Components.classes['@mozilla.org/intl/stringbundle;1'].getService(Components.interfaces.nsIStringBundleService).createBundle('chrome://fvd.speeddial/locale/fvd.toolbar.properties');
	    var txt = bundle.GetStringFromName('alert.sd_wrong_url.fvd_suite_not_runned.text');
	    var title = bundle.GetStringFromName('alert.sd_wrong_url.fvd_suite_not_runned.title');
	            
	    
	    prompts.alert(window, title, txt);
	}
	catch( ex ){
		alert(ex);
	}

}

function correctUrl( url, noErrors ){
	url = url.trim();
	
	if( FVDSSDMisc.isAboutUrl( url ) ){
		return true;
	}
	
	if (!FVDSSDMisc.isUrl(url)) {		
		url = "http://" + url;		
	}
	
	if( !FVDSSDMisc.isCorrectUrl( url ) || url == "http://" ){
		if( !noErrors ){
			incorrectUrlAlert();			
		}

		return false;
	}	

	document.getElementById( "url" ).value = url;
	
	return url;
}

function  back(){
	
	var tabs = document.getElementById( "tabsContainer" );
	
	if( tabs.selectedIndex == 1 ){
		tabs.selectedIndex = 0
	}
	else{
		tabs.selectedIndex = 1;
	}
		
}

function onOK(){

	
	var tabs = document.getElementById( "tabsContainer" );
	
	/*
	// check tab selection
	if( currentTab == "tabMain" ){	
		// go next tab		
		tabs.selectedIndex = 1;		

		return false;
	}
	*/
	
	var url = document.getElementById( "url" ).value.trim();
	
	if( !url ){
		incorrectUrlAlert();
		return false;
	}
		
	url = correctUrl( url );
	
	if( !url ){
		return false;
	}
	
	var thumb_source_type = document.getElementById( "preview_type" ).value;
	var thumb_url = "";
	
	if( thumbParamsChanged() ){
		switch( thumb_source_type ){
			case "force_url":
				thumb_url = getScreenUrl();		
				if( !thumb_url ){
					return false;
				}
			break;
			case "local_file":
				thumb_url = getLocalFilePath();		
				if( !thumb_url ){
					return false;
				}			
			break;
		}
	}
	else{
		thumb_url = initData.thumb_url;
	}
	

	var params = window.arguments[0];
	
	if( window.arguments[0] ){
		params.manually_cropped = window.arguments[0].manually_cropped;
	}
			
	if( _oldThumbUrl && _oldThumbUrl != thumb_url || thumb_source_type != "local_file" ){
		params.manually_cropped = 0;		
	}
	
	if( thumb_source_type == "local_file" && _oldThumbUrl != thumb_url ){
		params.need_sync_screen = 1;	
	}
		
	params.thumb_source_type = thumb_source_type;
	params.thumb_url = thumb_url;
	params.url = document.getElementById( "url" ).value;	
	params.title = document.getElementById( "title" ).value;	
	params.group = document.getElementById( "group" ).value;	
	params.use_js = document.getElementById( "use_js" ).value;	
	params.hand_changed = handChangedTitle;
	params.delay = document.getElementById( "delay" ).value;	
	params.disable_plugins = document.getElementById("disable_plugins").value;	
	params.needUpdateThumb = thumbParamsChanged();
	params.update_interval = "";
	if( document.getElementById("autoUpdateState").checked ){
		params.update_interval = document.getElementById("autoUpdateInterval").value + "|" + document.getElementById("autoUpdateIntervalType").value;
	}	
	
	params.ok = true;
	
	if( sdPreviewItem && thumb_source_type == "force_url" && thumb_url == sdPreviewItem.url ) {
		
		userPicsFrame().PickUserPics.rate( sdPreviewItem.id );		
		
	}
	
	if( !isModifyRequest && speedDialSSD ){
		// add dial request

		if(speedDialSSD.addDialToStorage( params )){
			dialAddedAlert();			
			resetForm();		
			
			if( window.arguments[0].eventListeners && window.arguments[0].eventListeners.onSuccess ){
				window.arguments[0].eventListeners.onSuccess();
			}	
			
			if( document.getElementById("closeWindowAfterSuccess").checked ){
			 	window.close();
			}
		}	
		
	
		return false;
	}
	
	return true;
}


function thumbParamsChanged(){
	return true;// changed always
	
	if( forceModifyPreviewData ){
		return true;
	}
	
	var thumb_url = "";
	var thumb_source_type = document.getElementById( "preview_type" ).value;
	
	switch( thumb_source_type ){
		case "force_url":
			thumb_url = document.getElementById("screen_url").value;
		break;
		case "local_file":
			thumb_url = document.getElementById("local_file_path").value;	
		break;
	}
	
	var thumb_source_type = document.getElementById( "preview_type" ).value;
	
	var changed = false;
	if( initData ){
		if( thumb_source_type != initData.thumb_source_type ||
			thumb_url != initData.thumb_url ){
			changed = true;
		}	
	}
	else{
		changed = true;
	}
	
	return changed;
}

function dialAddedAlert(){
	try{
	    //var prompts = Components.classes['@mozilla.org/embedcomp/prompt-service;1'].getService(Components.interfaces.nsIPromptService);
	    //prompts.alert(window, fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "alert.sd.dial_added.title" ), fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "alert.sd.dial_added.text" ));		
		var notice = document.getElementById("dialAddedUpdatedNotice");
		notice.value = fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "alert.sd.dial_added.text" );
		notice.setAttribute( "displayed", 1 );
	}
	catch( ex ){
		//alert(ex);
	}

}

function resetForm(){	
	setPreviewImage(null);
		
	document.getElementById("url").value = "";	
	document.getElementById("screen_url").value = "";
	document.getElementById("local_file_path").value = "";	
	document.getElementById("title").value = "";	
	document.getElementById("preview_type").value = "url";
	setScreenType('url');
	
	var tabs = document.getElementById( "tabsContainer" );
	tabs.selectedIndex = 0;
}

function onCancel(){
	if( getDialogMode() == "userpics" ){
		setDialogMode( "add" );
		return false;
	}
	
	return true;
}



function grabTitle( noErrors ){	
	var url = document.getElementById( "url" ).value;
	
	url = correctUrl( url, noErrors );	
	if( !url ){
		return false;
	}
 	
	var label = document.getElementById( "get_title_label" );
	
	if( label.getAttribute( "loading" ) == 1 ){
		return;
	}
	
	getTitleDetachEvent();
	
	label.setAttribute( "loading", "1" );
	label.setAttribute( "value", fvd_speed_dial_FVDSSDToolbarProperties.getString("fvd.toolbar", "dialog.sd_new_dial.get_title.loading") );
	
	fvd_speed_dial_ScreenMaker.shedule({
		url: url,
		type: "url",
		noLoadImages: true,
		onSuccess: function( result ){
			_callbackReadTitle( result.title );
		},
		onFail: function( result ){
			_callbackReadTitle( result.title );
		}
	});
	
}

function handChangeTitle(){
	handChangedTitle = 1;
}

function _callbackReadTitle( title ){
	
	if( title ){
		handChangedTitle = 0;
		document.getElementById( "title" ).value = title;
	}
	else{
		displayNotFoundTitleLabel();
	}
	
	resumeGetTitleLabel();
}

function resumeGetTitleLabel(){
	var label = document.getElementById( "get_title_label" );
	
	getTitleAttachEvent();
	document.getElementById( "get_title_label" ).setAttribute( "loading", "0" );
	label.setAttribute( "value", fvd_speed_dial_FVDSSDToolbarProperties.getString("fvd.toolbar", "dialog.sd_new_dial.get_title.label") );
}

function displayNotFoundTitleLabel(){
	var label = document.getElementById( "title_not_found_label" );
	label.setAttribute( "raised", "1" );
	setTimeout( function(){
		label.setAttribute( "raised", "0" );
	}, 5000 );
}

var listener = {
		onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus){
	
			if( aStatus == Components.results.NS_ERROR_UNKNOWN_HOST ){
				displayNotFoundTitleLabel();
				resumeGetTitleLabel();
				aRequest.cancel( 0 );
			}
		},
	
        onLocationChange: function(aWebProgress, aRequest, aURI){

        },
        onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress){
        },
        onStatusChange: function(aWebProgress, aRequest, aStatus, aMessage){
            
        },
        onSecurityChange: function(aWebProgress, aRequest, aState){
        },
        onLinkIconAvailable: function(){
        },
        QueryInterface: function(aIID){
            if (aIID.equals(Components.interfaces.nsIWebProgressListener) || aIID.equals(Components.interfaces.nsISupportsWeakReference) || aIID.equals(Components.interfaces.nsISupports)) 
                return this;
            throw Components.results.NS_NOINTERFACE;
        }
	
};



function getTitleAttachEvent(){
	document.getElementById( "get_title_label" ).addEventListener( "click", grabTitle, false );
}

function getTitleDetachEvent(){
	document.getElementById( "get_title_label" ).removeEventListener( "click", grabTitle, false );
}


function pickScreenLocalFile(  ){
	var nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window, fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "dialog.sd_new_dial.select_screen_dialog.title" ), nsIFilePicker.modeOpen);
	fp.appendFilters(nsIFilePicker.filterImages);
		
	var res = fp.show();
	if (res == nsIFilePicker.returnOK){
		document.getElementById( "local_file_path" ).value = fp.file.path;	 
		forceModifyPreviewData = true;
		preview();
	}
}

function wrongFileMessage(){
	var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
	                              				  .getService(Components.interfaces.nsIPromptService);
	promptService.alert( window, 
						 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "alert.sd_url_deny.wrong_image"),
						 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "alert.sd_url_deny.text") );
}

function getLocalFilePath( ignoreErrors ){
	try{
		if (fvd_speed_dial_Misc.appVersion() < 13) {
			var localFile = Components.classes["@mozilla.org/file/local;1"]
		                			  .createInstance(Components.interfaces.nsILocalFile);	
		}
		else{
			var localFile = Components.classes["@mozilla.org/file/local;1"]
		                			  .createInstance(Components.interfaces.nsIFile);				
		}

								  	
		localFile.initWithPath( document.getElementById("local_file_path").value );
		if( !localFile.isFile() ){
			if( !ignoreErrors || thumbParamsChanged() ){
				throw new Exception( "err" );				
			}
		}
		
		return 	localFile.path;	  
	}
	catch( ex ){	
		wrongFileMessage();
		return null;
	}

}

function getLocalFileUrl( ignoreErrors ){
	try{
		if (fvd_speed_dial_Misc.appVersion() < 13) {
			var localFile = Components.classes["@mozilla.org/file/local;1"]
		                			  .createInstance(Components.interfaces.nsILocalFile);	
		}
		else{
			var localFile = Components.classes["@mozilla.org/file/local;1"]
		                			  .createInstance(Components.interfaces.nsIFile);	
		}
								  
								  	
		localFile.initWithPath( document.getElementById("local_file_path").value );
		if( !localFile.isFile() ){
			// display wrong file message
			throw new Exception( "err" );
		}
		
		return FVDSSDMisc.fileToURI( localFile );			  
	}
	catch( ex ){
		if( !ignoreErrors ){
			wrongFileMessage();			
		}
		//dump( "ERROR GET LOCAL FILE URL " + ex + "\r\n" );
		return null;
	}

}

function getScreenUrl( ignoreErrors ){
	var url = document.getElementById( "screen_url" ).value;
	url = url.trim();
	if( !url || !FVDSSDMisc.isCorrectUrl( url ) ){
		if( !ignoreErrors ){
			wrongFileMessage();			
		}
		return null;
	}
	
	return url;
}

function setPreviewImage( url ){
	var previewBox = document.getElementById( "preview_box" );
	
	previewBox.setAttribute("loading", "0");
	
	if( url ){
		previewBox.setAttribute("nopreview", "0");
		if( url == "thumb_failed" ){
			speedDialSSD._setFailImageForSnippet( previewBox, 200 );
		}
		else{
			speedDialSSD._setPreviewImageForSnippet( previewBox, url, 200, document.getElementById( "preview_type" ).value );	
		}
		
	}
	else{
		previewBox.style.background = DEFAULT_DIAL_BG;
		previewBox.setAttribute("nopreview", "1");
	}
}

function setProgress(percentage){
	var progress = document.getElementById( "previewProgress" );
	progress.value = percentage;
}

function loadPreviewByUrl( enableJs, disablePlugins, url, noError ){
	var previewBox = document.getElementById( "preview_box" );		
	
	previewBox.style.background = DEFAULT_DIAL_BG;	
	
	fvd_speed_dial_ScreenMaker.shedule({
		url: url,
		type: "image",
		enableJs: enableJs,
		disablePlugins: disablePlugins,
		delay: document.getElementById("delay").value,
		imageUrl: url,		
		onSuccess: function( result ){
			setPreviewImage( result.dataURL );	
		},
		onFail: function( result ){
			if (!noError) {
				setPreviewImage("thumb_failed");
				incorrectUrlAlert();
			}
		}
	});

}

function loadPreviewByDialUrl( enableJs, disablePlugins, noError, noCache ){	

	var previewBox = document.getElementById( "preview_box" );		
	
	previewBox.style.background = DEFAULT_DIAL_BG;
	
	var url = document.getElementById( "url" ).value.trim();
	
	if( !url ){
		if( !noError ){
			incorrectUrlAlert();			
		}
		return false;
	}
	
	if( url.toLowerCase().indexOf("http") != 0 ){
		url = "http://" + url;
	}
	
	var fromCacheImageUrl = urlImageFromCache( enableJs, disablePlugins, document.getElementById("delay").value, url );
	
	if( !noCache && fromCacheImageUrl ){
		setPreviewImage( fromCacheImageUrl );	
	}
	else{
		previewBox.setAttribute("loading", "1");
		
		fvd_speed_dial_ScreenMaker.shedule({
			url: url,
			type: "url",
			enableJs: enableJs,
			disablePlugins: disablePlugins,
			delay: document.getElementById("delay").value,
			onProgress: function( progress, total ){
				var percentage = Math.round(progress/total * 100);
				setProgress( percentage );
			},
			onSuccess: function( result ){
				setPreviewImage( result.dataURL );	
			},
			onFail: function( result ){
				if (!noError) {
					setPreviewImage("thumb_failed");
					incorrectUrlAlert();
				}	
			}
		});
		
	}
	

}

function preview( enableJs, disablePlugins, noError, noCache ){	

	var url = null;
	var enableJs;
	var disablePlugins;
	
	if( typeof enableJs == "undefined" || enableJs === null){
		enableJs = document.getElementById("use_js").value;
	}
	if( typeof disablePlugins == "undefined" || disablePlugins === null){
		disablePlugins = document.getElementById("disable_plugins").value;
	}


	switch( document.getElementById( "preview_type" ).value ){
		case "url":

		
			loadPreviewByDialUrl(enableJs, disablePlugins, noError, noCache);
		break;
		case "force_url":		
			url = getScreenUrl(noError);
			if( url ){
				loadPreviewByUrl(enableJs, disablePlugins, url, noError);				
			}

			//setPreviewImage( url );				
		break;
		case "local_file":
			url = getLocalFileUrl(noError);	
			if( url ){
				try{
					loadPreviewByUrl(enableJs, disablePlugins, url, noError);		
							
				}
				catch(ex){
	
				}

			}
			//setPreviewImage( url );				
		break;
	}
	
	var title = document.getElementById("title").value;
	if( !title || !handChangedTitle ){
		grabTitle( true );		
	}
	
}

function setScreenType( type ){	
	var urlField = document.getElementById( "screen_url_box" );	
	var lblDefaultUrl = document.getElementById( "lbl_default_images" );	
	var fileField = document.getElementById( "local_file_path" );	
	var fileButton = document.getElementById( "btn_local_file_path" );	
	
	
	
	urlField.setAttribute( "hidden", true );
	fileField.setAttribute( "hidden", true );
	fileButton.setAttribute( "hidden", true );
	lblDefaultUrl.setAttribute( "hidden", true );

	disableUrlParamsSelecting( true );

	if( type == "force_url" ){
		urlField.removeAttribute( "hidden" );
		lblDefaultUrl.removeAttribute( "hidden" );
		disableUrlParamsSelecting(  );
	}		
	else if( type == "local_file" ){
		fileField.removeAttribute( "hidden");
		fileButton.removeAttribute( "hidden" );
		disableUrlParamsSelecting(  );
	}	

	toContent();
}

function refreshAutoUpdateState(){
	var active = document.getElementById("autoUpdateState").checked;
	var autoUpdateBox = document.getElementById( "autoUpdateBox" );
	var elements = autoUpdateBox.querySelectorAll( "textbox,menulist,label" );
	
	for( var i = 0; i != elements.length; i++ ){
		if( active ){
			elements[i].removeAttribute( "disabled" );						
		}
		else{
			elements[i].setAttribute( "disabled", true );			
		}

	}
	
}

function changeTab( event ){	
	document.getElementById("closeWindowAfterSuccess").setAttribute( "hidden", true );
	
	try{		
		currentTab = document.getElementById("tabsContainer").selectedItem.id;
		
		var dialog = document.getElementsByTagName("dialog")[0];
		var acceptButton = dialog.getButton("accept");
		var extra1Button = dialog.getButton("extra1");
		
		var label;
		
		if( isModifyRequest ){
			label = fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "dialog.sd_new_dial.button.ok_modify" );					
		}
		else{
			label = fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "dialog.sd_new_dial.button.ok_create" );					
		}
		
		var lablelExtra1 = "";
		switch( currentTab ){
			case "tabMain":
				lablelExtra1 = fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "dialog.sd_new_dial.button.next" );
				//extra1Button.setAttribute( "hidden", true );
			break;
			case "tabPreview":
				extra1Button.setAttribute( "hidden", false );
				
				lablelExtra1 = fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "dialog.sd_new_dial.button.back" );
				
				/*
				setTimeout( function(){
					document.getElementById( "previewButton" ).focus();					
				}, 0 );
				*/

				document.getElementById("closeWindowAfterSuccess").removeAttribute( "hidden" );				

				toContent();

			break;
		}
		
		acceptButton.setAttribute( "label", label );
		extra1Button.setAttribute( "label", lablelExtra1 );
		
		// select group
		if( !isModifyRequest ){
			if( currentTab == "tabPreview" ){		
				var needBuildCells = false;
				var group = document.getElementById( "group" ).value;
				
				if( group != speedDialSSD._getGroupId() ){					
					speedDialSSD.setCurrentGroup( group );
					needBuildCells = true;					
				}	
				
				if( speedDialSSD._displayMode() != "top_sites" ){
					speedDialSSD.setDisplayType( "top_sites" );
					needBuildCells = false;		
					
					if( adjustedWindowX == window.screenX && adjustedWindowY == window.screenY ){
						adjustPosition();						
					}			
				}
				
				if( needBuildCells ){
					speedDialSSD.buildCells();
				}						
			}
		}
	}
	catch( ex ){

	}
	
	
	
	
}

function disableUrlParamsSelecting( enable ){
	for( var k in disables ){
		if( disables[k] == "use_js" ){
			return false;
		}
	}

	
	var urlCustomSettings = document.getElementById( "url_custom_settings" );
	
	urlCustomSettings.setAttribute( "hidden", enable ? false : true );
	/*
	var subElems = radioGroup.getElementsByTagName( "radio" );	
	for( var i = 0; i != subElems.length; i++ ){
		subElems[i].setAttribute( "disabled", enable ? false : true );
	}
	*/
}

function changeScreenUrl( uri, checkMultiVariants, notPreview ){
	if( checkMultiVariants ){
		if( uri.indexOf("|") != -1 ){
			var images = uri.split( "|" );
			uri = images[0];
			var container = document.getElementById("default_images_variants").getElementsByTagName("menupopup")[0];
			container.parentNode.setAttribute( "hidden", false );
			while( container.firstChild ){
				container.removeChild( container.firstChild );
			}
			
			var preTitle = document.getElementById("default_images").selectedItem.getAttribute( "label" );
			
			for( var i = 0; i != images.length; i++ ){
				var title = preTitle + " #" + (i + 1);
				var menuItem = document.createElement( "menuitem" );
				menuItem.setAttribute( "label", title );
				menuItem.setAttribute( "value", images[i] );	
				container.appendChild( menuItem );
			}
			
			container.parentNode.selectedIndex = 0;
		}
		else{
			document.getElementById("default_images_variants").setAttribute( "hidden", true );
		}
	}

	document.getElementById("screen_url").value = uri;
	
	if( !notPreview ){
		preview();		
	}
	
	toContent();
}

function fillDefaultImages(){
	var container = document.getElementById( "default_images" ).getElementsByTagName("menupopup")[0];
	
	var defaultImages = storage.getDefaultDials();
	
	for( var i = 0; i != defaultImages.length; i++ ){
		var menuItem = document.createElement( "menuitem" );
		menuItem.setAttribute( "label", defaultImages[i].title );
		menuItem.setAttribute( "value", defaultImages[i].uri );	
		container.appendChild( menuItem );
	}
}

function fillGroupsList(){
	// fill group list
	var groups = storage.getGroupsList();
	var container = document.getElementById( "group" ).getElementsByTagName("menupopup")[0];
	
	var prevValue = null;
	
	if( container.childNodes.length ){
		prevValue = container.value;
		while( container.firstChild ){
			container.removeChild( container.firstChild );
		}
	}
	
	for( var i = 0; i != groups.length; i++ ){
		var menuItem = document.createElement( "menuitem" );
		menuItem.setAttribute( "label", groups[i].name );
		menuItem.setAttribute( "value", groups[i].id );	
		container.appendChild( menuItem );
	}
	
	if( speedDialSSD.storage.groupsCount() < speedDialSSD.MAX_GROUPS_LIMIT ){
		// add new group label
		var menuItem = document.createElement( "menuitem" );
		menuItem.setAttribute( "label", fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "dialog.sd_new_dial.add_new_group.title" ) );
		menuItem.setAttribute( "value", "add" );	
		menuItem.setAttribute( "class", "contextAddGroup" );
		
		menuItem.onclick = function(){
			var groupId = speedDialSSD.addGroup();
			fillGroupsList();
			if( groupId != null ){
				container.parentNode.value = groupId;			
			}
			else{
				container.parentNode.itemIndex = 0;
			}
		}
				
		container.appendChild( menuItem );		
	}
	
	
	if( prevValue != null ){
		container.value = prevValue;
	}
}


window.addEventListener("unload", function(){

}, true);


window.addEventListener("load", function(){
	changeTab();
	
	gFVDSSD = opener.fvd_speed_dial_gFVDSSD;
	fvd_speed_dial_gFVDSSD = opener.fvd_speed_dial_gFVDSSD; // compatibility with page grabber
	
	dialog = document.getElementsByTagName("dialog")[0];
	
	//force set 15 urls to display in box
	var registry = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService);
	var branch = registry.getBranch("browser.urlbar.");
	branch.setIntPref( "maxRichResults", 15 );
	

	if(window.arguments[0].url){
		document.getElementById( "url" ).value = window.arguments[0].url;		
	}
	if( window.arguments[0].title ){
		document.getElementById( "title" ).value = window.arguments[0].title;
	}
	
	if( typeof window.arguments[0].use_js != "undefined" ){
		document.getElementById( "use_js" ).value = window.arguments[0].use_js;
	}
	
	
	fillDefaultImages();
	
	if( window.arguments[0].thumb_source_type ){
		
		var thumbUrl = window.arguments[0].thumb_url;

		if( window.arguments[0].thumb_source_type == "local_file" && thumbUrl ){
			_oldThumbUrl = thumbUrl;
		}
		
		if( window.arguments[0].thumb_source_type == "force_url" ){
			document.getElementById( "preview_type" ).selectedIndex = 1;	
			if( thumbUrl ){				
				
				
				// search url in default images
				var defaultImagesContainer = document.getElementById( "default_images" ).getElementsByTagName("menupopup")[0];
				for( var i = 0; i < defaultImagesContainer.childNodes.length; i++ ){
					var node = defaultImagesContainer.childNodes[i];
					if( node.getAttribute("value").indexOf( thumbUrl ) != -1 ){
						document.getElementById( "default_images" ).selectedIndex = i;
						if( node.getAttribute("value").indexOf( "|" ) != -1 ){
							// multi urls prepare
							changeScreenUrl( node.getAttribute("value"), true, true );
							document.getElementById("default_images_variants").value = thumbUrl;
						}
						break;
					}
				}
				
				
				document.getElementById( "screen_url" ).value = thumbUrl;	
			
			}
		}
		else if( window.arguments[0].thumb_source_type == "local_file" ){
			document.getElementById( "preview_type" ).selectedIndex = 2;	
			if( thumbUrl ){
				document.getElementById( "local_file_path" ).value = thumbUrl;					
			}
		}
		
		setScreenType(window.arguments[0].thumb_source_type);
		
		if( window.arguments[0].update_interval ){
			document.getElementById("autoUpdateState").checked = true;
			var tmp = window.arguments[0].update_interval.split("|");
			document.getElementById("autoUpdateInterval").value = tmp[0];
			document.getElementById("autoUpdateIntervalType").value = tmp[1];
		}
	}
	else{
		setScreenType();
	}

	

	
	document.getElementById( "helper_browser" ).addEventListener( "load", _callbackReadTitle, true );	
	document.getElementById( "helper_browser" ).addProgressListener( listener );
	
	getTitleAttachEvent();
	document.getElementById( "get_title_label" ).setAttribute( "value", fvd_speed_dial_FVDSSDToolbarProperties.getString("fvd.toolbar", "dialog.sd_new_dial.get_title.label") );
	

	fillGroupsList();	

	
	if( window.arguments[0].group_id ){
		document.getElementById( "group" ).value = window.arguments[0].group_id;
	}
	else{
		document.getElementById( "group" ).selectedIndex = 0;
	}
	
	if( window.arguments[0].hand_changed ){
		handChangedTitle = window.arguments[0].hand_changed;
	}
	
	if( window.arguments[0].delay ){
		document.getElementById("delay").value = window.arguments[0].delay;
	}

	if( typeof window.arguments[0].disable_plugins != "undefined" ){
		document.getElementById("disable_plugins").value = window.arguments[0].disable_plugins;				
	}
	else{
		document.getElementById("disable_plugins").value = fvd_speed_dial_gFVDSSDSettings.getBoolVal( "sd.disable_plugins" ) ? 1 : 0;
	}
	
	document.getElementById( "url" ).focus();
	
	if (window.arguments[0].previewUrl) {
		// display preview
		//preview();
		setPreviewImage( window.arguments[0].previewUrl );
	}	
	
	if( window.arguments[0].disableItems ){
		var disableItems = window.arguments[0].disableItems;
		disables = window.arguments[0].disableItems;
		for( var k in disableItems ){			
			var elem = document.getElementById( disableItems[k] );
			if( elem ){
				if( elem.tagName == "radiogroup" ){
					var subElems = elem.getElementsByTagName( "radio" );	
					for( var i = 0; i != subElems.length; i++ ){
						subElems[i].setAttribute( "disabled", true );
					}
				}
				else{
					elem.setAttribute( "disabled", true );					
				}
			}
		}
	}
	
	if( window.arguments[0] ){
		for( var k in window.arguments[0] ){
			initData[k] = window.arguments[0][k];
		}
	}
	
	
	if( !isModifyRequest ){
		document.getElementById( "preview_box" ).style.background = DEFAULT_DIAL_BG;
	}
	
	refreshAutoUpdateState();
		
	if (!isModifyRequest) {
		document.getElementById("pickUrlFrom").removeAttribute("hidden");
		
		var pickPanel = document.getElementById("pickUrlsFromPanel");
				
		pickPanel.addEventListener("popupshowing", function( event ){
					
			var container = document.getElementById("pickUrlsFromPanelContainer");		
						
			if( event.explicitOriginalTarget ){
				
				var elId = event.explicitOriginalTarget.getAttribute("id");
				
				var urls = [];				

				while( container.firstChild ){
					container.removeChild( container.firstChild );
				}
				
				fvd_speed_dial_Async.chain([
					
					function( chainCallback ){
								
						switch( elId ){
							case "pickUrlFromMostPopular":
							
								pickPanel.setAttribute("loading", 1);
							
								fvd_speed_dial_RemoteRequest.request( "country_top.php", {}, function( error, data ){
								
									pickPanel.removeAttribute("loading");
								
									if( error ){
										return;
									}
									
									data.domains.forEach(function( domain ){
										urls.push({
											url: "http://" + domain,
											title: domain
										});
									});
									
									chainCallback();
									
								} );
							
								
							
							break;
							
							case "pickUrlFromOpenedTabs":
								
								var gBrowser = opener.gBrowser;
														
		                        var num = gBrowser.browsers.length;
		                        for (var i = 0; i < num; i++) {
		                            var b = gBrowser.getBrowserAtIndex(i);
		                            try {
										var url = b.currentURI.spec;
										var title = b.contentTitle;
		                                
										if( url.indexOf( "http://" ) !== 0 && url.indexOf( "https://" ) !== 0 ){
											continue;
										}
										
										urls.push({
											url: url,
											title: title
										});
		                            } 
		                            catch (e) {
		                                Components.utils.reportError(e);
		                            }
		                        }
		                        
		                        chainCallback();
								
							break;
							case "pickUrlFromMostVisited":
																
								urls = storage.getMostVisited( "month", "domain", 25, "visits" );						
								
								chainCallback();
																							
							break;					
						}
								
					},
					
					function(){				
				
						if( urls.length == 0 ){
							event.stopPropagation();
							event.preventDefault();
							return false;
						}
												
						try{
							
							urls.forEach(function( data ){
													
								var item = document.createElement( "vbox" );
								item.className = "item";
								var urlContainer = document.createElement( "label" );
								var titleContainer = document.createElement( "label" );		
								
								urlContainer.className = "url";
								titleContainer.className = "title";
								
								titleContainer.setAttribute( "value", data.title );
								urlContainer.setAttribute( "value", data.url );			
								urlContainer.setAttribute("crop", "right");
								titleContainer.setAttribute("crop", "right");						
								
								item.appendChild( titleContainer );
								item.appendChild( urlContainer );	
														
								container.appendChild( item );		
								
								item.addEventListener( "click", function(){
									document.getElementById("url").value = data.url;
									document.getElementById("title").value = data.title;							
									
									pickPanel.hidePopup();
								} );		
								
							});
							
						}
						catch( ex ){
							Components.utils.reportError(e);
						}
						
					}
					
				]);
				

			}
			
		});
	}
	
	var urlElem = document.getElementById("url");
	
	var _testInputUrlValue = {
		oldValue: "",
		interval: null,
		listener: null,
		start: function(){
			var that = this;
			
			this.interval = setInterval(function(){
			
				var value = urlElem.value;
				
				if( value != that.oldValue ){
					that.oldValue = value;
					if( that.listener ){
						that.listener();	
					}							
				}
				
			}, 100);
								
		},
		end: function(){
			clearInterval( this.interval );
		}				
	};
	
	_testInputUrlValue.listener = function(){
		
		var dialog = document.getElementsByTagName("dialog")[0];
		
		var iframe = document.querySelector( "#fastPickUserPic iframe" ).contentWindow;					
		
		function _hide(){
			dialog.removeAttribute("fast_user_pics");	
			window.sizeToContent();
		}
		
		iframe.cancelAllRequests();
		
		var url = urlElem.value;
		var urlLower = url.toLowerCase();			
		
		if( !url ){
			return _hide();
		}	
					
		if( urlLower.indexOf( "http://" ) == -1 && urlLower.indexOf( "https://" ) == -1 ){
			url = "http://" + url;
		}
		
		var parsed = fvd_speed_dial_Misc.parseUrl( url );
		
		if( !parsed || !parsed.host ){
			return _hide();
		}
		
		var tmp = parsed.host.split(".");
		
		if( tmp.length < 2 ){
			return _hide();
		}
		
		var zone = tmp[ tmp.length - 1 ];
		
		if( zone.length < 2 ){
			return _hide();
		}			
						
		iframe.display( parsed.host, function( pics ){
			
			if( pics.length > 0 ){
				dialog.setAttribute( "fast_user_pics", 1 );
				
				iframe.resultCallback = function( item ){
					
					userPicsResultCallback( item );
					
					setTimeout(function(){
						_hide();
					}, 0);					
					
				};
				
				window.sizeToContent();		
			}
			
		} );
		

	};
	
	_testInputUrlValue.start();
		
}, false);

function adjustPosition(){
	var resultXPos;
	var resultYPos;
	var centerScreen = false;

	try{
		var openerWidth = window.opener.parent.innerWidth;
		var openerHeight = window.opener.parent.innerHeight; 
		
		var xPos = Math.round(openerWidth/2 - DIALOG_WIDTH/2);
		var yPos = 0;
		
		if( openerHeight > DIALOG_HEIGHT ){				
			yPos = opener.document.getElementsByClassName("topMenuLine")[0].boxObject.screenY + opener.document.getElementsByClassName("topMenuLine")[0].boxObject.height;
		}
		else{
			// display on center screen
			
	//		alert( window.opener.parent.availRect.bottom );
		}
		
				
		resultXPos = xPos + window.opener.parent.screenX;
		resultYPos = yPos + window.opener.parent.screenY;
		
		if( resultYPos < 0 ){
			centerScreen = true;
		}
		
		if( resultXPos < 0 ){
			centerScreen = true;		
		}
		
		if( ( resultYPos + DIALOG_HEIGHT ) > window.screen.height ||
			  (resultXPos + DIALOG_WIDTH ) > window.screen.width){
			centerScreen = true;		
		}
	}
	catch( ex ){
		centerScreen = true;
	}


	
	if( centerScreen ){
		resultXPos = window.screen.width / 2 - DIALOG_WIDTH/2;
		resultYPos = window.screen.height / 2 - DIALOG_HEIGHT/2;
	}
	
	window.screenY = resultYPos;	
	window.screenX = resultXPos;	
	
	adjustedWindowX = resultXPos;
	adjustedWindowY = resultYPos;	
}

window.addEventListener( "load", function(){
	//adjustPosition();	
	toContent();
	
	document.getElementById("closeWindowAfterSuccess").checked = fvd_speed_dial_gFVDSSDSettings.getBoolVal( "sd.add_dial_close_window_if_success" );
}, true );

window.addEventListener( "beforeunload", function(){
	
	// save close window state
	
	fvd_speed_dial_gFVDSSDSettings.setBoolVal( "sd.add_dial_close_window_if_success", document.getElementById("closeWindowAfterSuccess").checked );
	
	
}, false );

document.addEventListener("click", function(){
	var notice = document.getElementById("dialAddedUpdatedNotice");
	notice.setAttribute( "displayed", 0 );
});
