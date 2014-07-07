var EXPORTED_SYMBOLS = ["fvd_speed_dial_Dialogs"]; 

const DIALOG_FILE_PATH = "chrome://fvd.speeddial/content/dialogs/dialog.xul";

fvd_speed_dial_Dialogs = new function(){
	
	this.open = function( params ){
			
		params.window.openDialog( DIALOG_FILE_PATH, "", 'chrome,titlebar,toolbar,centerscreen,dialog=yes,modal', params );	
		
		return params._result.button;	
		
	}
	
}
