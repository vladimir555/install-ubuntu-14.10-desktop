const SETTINGS_KEY_BRANCH = 'fvdsd.';

var dd_data = [];
var selected_value = null;
var allow_close = false;
var menu_opened = false;
var sites_info = {
	"web": {
		cx: "001477807305393216127:7dbycpqumuw",
		selected: true
	},

	"video-search": {
		
		redirect: "http://fvdvideo.com/search/?q=%q%"
	},
/*
	"adult":{
		cx: "009547620127771566411:ry_eo0aja1o"	
	},
	*/
	"flash-games":{
		cx: "009547620127771566411:vdegr9qva-o"	
	},
	"video":{
		cx: "partner-pub-5087362176467115:h6z8ss-efx2"	
	},

	"people":{
		cx: "009547620127771566411:tzp3hyliplo"	
	},

	'twitter': {

		redirect: "http://twitter.com/search?q=%q%"
	},

	'wiki' : {

		redirect: "http://en.wikipedia.org/wiki/%q%"
	},

	"youtube" : {
		redirect: "http://www.youtube.com/results?search_type=&aq=f&search_query=%q%"		
	},
	"metacafe" : {
		redirect: "http://www.metacafe.com/tags/%q%"
	},
	"google_videos" : {
		redirect: "http://www.google.com/search?q=%q%&tbs=vid:1",
		ico : "google"
	},
	"google_images" : {
		redirect : "http://images.google.com/images?q=%q%",
		ico : "google"
	},	
	"myspace" : {
		redirect: "http://www.myspace.com/search/videos?q=%q%"
	},
	"dailymotion" : {
		redirect : "http://www.dailymotion.com/relevance/search/%q%"
	},
	"break" : {
		redirect : "http://www.break.com/surfacevideo/%q%"
	},
	"blip": {
		redirect: "http://www.blip.tv/search?q=%q%"
	},
	"spike" : {
		redirect: "http://www.spike.com/search?mkt=en-us&FORM=VCM050&query=%q%"
	},
	"myvideo" : {
		redirect: "http://www.myvideo.de/Videos_A-Z?searchWord=%q%"
	},		
	"flurl" : {
		redirect: "http://www.flurl.com/search?site_id=147&search=Search&q=%q%"
	}
};

function dd_get_ico_class( info, site_name ){
	if( typeof info.ico != "undefined" ){
		ico_class = info.ico;
	}
	else{
		ico_class = site_name;			
	}
	ico_class = "ico-"+ico_class;		

	return "dd_ico " + ico_class;
}


function display_adult(display)
{
	if (!display)
	{
		if (current_value == 'adult') __dd_set_current_element('web');
	}
};

function is_adult_visible()
{
	var res = true;
	try
	{
		var reg = Components.classes['@mozilla.org/windows-registry-key;1'].createInstance(Components.interfaces.nsIWindowsRegKey);
		try
		{
			reg.open(reg.ROOT_KEY_CURRENT_USER, 'Software\\FVDSuite\\Firefox', reg.ACCESS_READ);
			if (reg.hasValue('DisableAdult') && (reg.getValueType('DisableAdult') == reg.TYPE_INT))
			{
					if (reg.readIntValue('DisableAdult') != 0) res = false;
			}
			reg.close();

		} catch (ee)
		{
			reg.close();
		}

	} catch (e) {}
	return res;
};

function end_drop_down(){	
	var list = document.getElementById("dd_search_list");
	if( list ){
		list.parentNode.removeChild(list);		
	}
	var selectedElem = document.getElementById("dd_selected_list_elem");
	if(selectedElem){
		selectedElem.parentNode.removeChild(selectedElem);		
	}
}

function start_drop_down(){
	return false;// temporary disabled

	var adult_display = is_adult_visible();

	for (var site_name in sites_info){
		var info = sites_info[site_name];
		if( typeof info.selected != "undefined" && info.selected ){
			selected_value = site_name;
		}
	}
	
	var new_list_id = "dd_search_list";
	
	var list = document.createElement( "div" );
	list.id = new_list_id;
	list.className = "dd_list_main";	
	list.style.display = "none";
	
	for( var site_name in sites_info ){
		
		if (!((site_name == 'adult') && (!adult_display)))
		{
			var info = sites_info[site_name];	
			var elem = document.createElement( "div" );	
			elem.className = "dd_list_option " + dd_get_ico_class(info, site_name);			
			var text_name = site_name.replace("_", " ");
			var f = text_name[0].toUpperCase();
			text_name = f + text_name.substr(1);
			elem.textContent = text_name;
		
			elem.value = site_name;
		
			elem.onclick = function(){			
				__dd_set_current_element( this.value );
			}
			list.appendChild( elem );
		}
	}	
	
	
	
	$("q").parentNode.appendChild(list);	
	
	__dd_set_current_element( selected_value );
	
		
}

function getY( oElement )
{
	
	var iReturnValue = 0;
	while( oElement != null ) {
		iReturnValue += oElement.offsetTop;
		oElement = oElement.offsetParent;
	}
	
	
	
	return iReturnValue;
}



function __dd_set_current_element( site_name ){
		
	var info = sites_info[site_name];
	
	var current =  document.createElement( "div" );	
		
	current.className = "dd_list_option dd_list_option_selected "+dd_get_ico_class(info, site_name);
		
	current.id = "dd_selected_list_elem";
	current.style.top = (getY($("q"))) + "px";

	currentImg = document.createElement( "img" );
	currentImg.setAttribute( "src", "chrome://fvd.speeddial/skin/sd/skin/search/images/arrow.png" );
	currentImg.style.marginLeft = "2px";
	
	current.appendChild( currentImg );
		
	current.onclick = function(){
		autocompleteHide();
		
		if( menu_opened ){
			return false;
		}		
		menu_opened = true;
		
		var list = $("dd_search_list");
		list.style.display = "";		
		list.style.position = "absolute";
		list.style.zindex = 1000;	
		
		allow_close = false;
		
		document.onclick = function(){
			if( allow_close ){			
				$("dd_search_list").style.display = "none";
				menu_opened = false;
			}
		}
		
		setTimeout( function(){
			allow_close = true;
		}, 100 );
		

		return false;
	}
		
	current_value = site_name;
	check_google_bk();

	var list = $("dd_search_list");
	list.style.display = "none";
	
	removeDOM_id("dd_selected_list_elem");

	$("q").parentNode.appendChild(current);
}

function removeDOM_id(element)
{
	try{
		var e = $(element);
		e.parentNode.removeChild(e);	
	}
	catch(ex){
		
	}
} 

function check_google_bk()
{
	if ((['web', 'adult', 'flash-games', 'video'].indexOf(current_value) != -1) && ($('q').value == ''))
	{
		$('q').setAttribute('google', 'true');
	} else
	{
		$('q').removeAttribute('google');
	}
}

window.onload = function(){
	$('q').addEventListener('blur', check_google_bk, false);	
}

function $( id ){
	return document.getElementById(id);
}

function dd_hide(){
	if( allow_close ){
		$("dd_search_list").style.display = "none";
		menu_opened = false;		
	}
}

function pre_submit(){
	var query = $("q").value;
	
	// check toolbar installed
	try{
		var key = "ff_fvdsd";
		if(frameWin.fvd_speed_dial_speedDialSSD._getMainWindow().fvd_speed_dial_fvdSSD.toolbarInstalled){
			key = "ff_fvdsd_toolbar";
		}	
	}
	catch( ex ){

	}
	
	
	//document.location = "http://flashvideodownloader.org/addon_search/?q="+encodeURIComponent(query)+"&from="+key;		
	document.location = "http://www.google.com/search?q="+encodeURIComponent(query);
	return false;
	/*

	check_google_bk();
	var v = current_value;
	var query = $("q").value;
	
	
	var info = sites_info[v];
	
	if( typeof info.redirect != "undefined" ){
		var url = info.redirect.replace( "%q%", encodeURIComponent( query ) );
		document.location = url;
		return false;
	}
	else if(typeof info.cx != "undefined"){
		$("cx").value = info.cx; 		
	}	
	return true;
	*/
}