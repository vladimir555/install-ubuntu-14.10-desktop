Components.utils.import("resource://fvd.speeddial.modules/poweroff.js");

var PowerOff = new function(){
	
	var self = this;
	
	var powerOffButton = null;
	var deck = null;
	var passCodeField = null;
	var enterPassCodeButton = null;
	
	var prefListener = new function(){
		
		this.observe = function( aSubject, aTopic, aData ){
			switch (aTopic) {
				case 'nsPref:changed':
					
					if( aData == "poweroff.enabled" || aData == "poweroff.hidden" ){
						refresh();
					}
					
				break;
			}
		};
		
	};
	
	function refresh( params ){
		
		params = params || {};
		if( typeof params.total == "undefined" ){
			params.total = true;
		}
		
		var messageEnablePoweroff = document.querySelector( "#expand_message .enablePowerOffMessage" );
		
		if( fvd_sd_PowerOff.isEnabled() ){
			messageEnablePoweroff.setAttribute( "hidden", true );
		}
		else{
			messageEnablePoweroff.removeAttribute( "hidden" );				
		}
		
		if( self.isHidden() ){
			parent.document.body.setAttribute( "poweroff", "1" );
			
			powerOffButton.setAttribute( "active", "1" );
			deck.setAttribute("selectedIndex", 1);
		}
		else{
			parent.document.body.setAttribute( "poweroff", "0" );
			
			powerOffButton.setAttribute( "active", "0" );			
			deck.setAttribute("selectedIndex", 0);			
		}		

		
		if( params.total ){
			fvd_speed_dial_speedDialSSD.refreshExpands();
			fvd_speed_dial_speedDialSSD.setupBodyDial();
			fvd_speed_dial_speedDialSSD.adaptFrameSize();					
		}
		
	}
	
	this.isHidden = function(){
				
		return fvd_sd_PowerOff.isHidden();
		
	};
	
	this.hide = function(){
		
		if( !this.isHidden() ){
			fvd_speed_dial_gFVDSSDSettings.setBoolVal( "poweroff.hidden", true );			
		}
		
	};
	
	this.show = function( password ){

		fvd_speed_dial_gFVDSSDSettings.setBoolVal( "poweroff.hidden", false );
		
		if( !fvd_speed_dial_speedDialSSD.expandState() ){
			fvd_speed_dial_speedDialSSD.toggleExpand();
		}
		
	};
		
	window.addEventListener( "load", function(){
		
		function tryEnterPasscode(){
			
			var password = passCodeField.value;
			
			passCodeField.value = "";
			
			if( fvd_sd_PowerOff.checkPassword( password ) ){				
				self.show();
			}
			else{
				promptService.alert( window, 
						 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "poweroff.alert.pass_code_wrong.title"),
						 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "poweroff.alert.pass_code_wrong.text") );
			}			
			
		}
		
		powerOffButton = parent.document.querySelector( "#searchBar .buttonsRightPanel .buttonPowerOff" );
		deck = document.querySelector( "#expand_message deck" );
		passCodeField = document.getElementById( "poweroffPasscode" );
		enterPassCodeButton = document.getElementById( "poweroffEnterPasscode" );
		
		powerOffButton.addEventListener( "click", function(){
			
			if( fvd_sd_PowerOff.isEnabled() ){				
				self.hide();				
			}
			else{				
				fvd_speed_dial_gFVDSSDSettings.displayWindow( "panePoweroff" );		
			}			
			
		}, false );
		
		powerOffButton.addEventListener( "mouseover", function(){			
			document.getElementById( "expand_message" ).setAttribute( "notransparency", 1 );			
		}, false );
		powerOffButton.addEventListener( "mouseout", function(){			
			document.getElementById( "expand_message" ).removeAttribute( "notransparency" );			
		}, false );
		
		passCodeField.addEventListener( "click", function( event ){
			event.stopPropagation();
			event.preventDefault();
		}, false );
		passCodeField.addEventListener( "mousedown", function( event ){
			event.stopPropagation();
		}, false );
		
		passCodeField.addEventListener( "keypress", function( event ){
			
			if( event.keyCode == 13 ){
				tryEnterPasscode();
			}
			
		}, false );
		
		enterPassCodeButton.addEventListener("click", function(){
			tryEnterPasscode();
		}, false);
		enterPassCodeButton.addEventListener( "mousedown", function( event ){
			event.stopPropagation();
		}, false );
		
		fvd_speed_dial_gFVDSSDSettings.addObserver( prefListener );
		refresh({
			total: false
		});
		
		// set to all popupmenus event handler
		// if poweroff is enabled - all context menus are disabled
		var menupopups = document.getElementsByTagName( "menupopup" );
		for( var i = 0; i != menupopups.length; i++ ){
			(function( menupopup ){
				menupopup.addEventListener( "popupshowing", function( event ){
					
					if( self.isHidden() ){
						event.preventDefault();
					}
					
				}, false );
				
			})( menupopups[i] );
		}
		
		
	}, false );
	
	window.addEventListener( "unload", function(){
		
		fvd_speed_dial_gFVDSSDSettings.removeObserver( prefListener );
		
	}, false );
	
	
};
