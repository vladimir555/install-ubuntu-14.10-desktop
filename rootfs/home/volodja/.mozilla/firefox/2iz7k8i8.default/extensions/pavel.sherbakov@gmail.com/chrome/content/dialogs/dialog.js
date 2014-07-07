
var params = arguments[0];

function finishRender(){
	if( params.onShow ){
		params.onShow( document );
	}
	
	window.sizeToContent();
}


window.addEventListener( "load", function(){
	
	var dialog = document.querySelector( "dialog" );
	
	params._result = {};
	
	//dialog.ondialogaccept = function(){
	//	params._result.button = "accept";
	//}
			
	dialog.addEventListener( "dialogaccept", function(){	
		params._result.button = "accept";
	}, false );		
	dialog.addEventListener( "dialogcancel", function(){	
		params._result.button = "cancel";
	}, false );		
	dialog.addEventListener( "dialogextra1", function(){	
		params._result.button = "extra1";
	}, false );	
	dialog.addEventListener( "dialogextra2", function(){	
		params._result.button = "extra2";
	}, false );	
			
	//setup buttons
	dialog.buttons = Object.keys( params.buttons ).join(",");
	
	for( var buttonName in params.buttons ){
		
		if( params.buttons[buttonName] ){
			dialog.getButton( buttonName ).setAttribute( "label", params.buttons[buttonName] );
		}	
		
	}
	
	dialog.setAttribute( "title", params.title );
	
	document.getElementById("text").setAttribute( "value", params.text );
	
	var imgElem = document.querySelector( "#mainContent image" );
	
	if( params.icon ){
		var img = new Image(  );		
		img.src = params.icon;
		img.onload = function(){			
			finishRender();
		}	
		
		imgElem.setAttribute( "src", params.icon );	
	}
	else{
		
		if( params.type ){
			switch( params.type ){
				case "confirm":
					imgElem.className += " question-icon";
				break;
			}
		}
		
		finishRender();
	}
	

	
}, false );