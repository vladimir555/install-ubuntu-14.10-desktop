var data = arguments[0];

function init(){

	document.getElementById("messageLabel").setAttribute( "value", data.message );

	var typesSelects = document.querySelectorAll( "#syncTypes > hbox" );
	
	for( var i = 0; i != typesSelects.length; i++ ){
		var select = typesSelects[i];
		if( data.allowTypes.indexOf( select.id.replace("syncType_", "") ) == -1 ){
			select.setAttribute( "hidden", true );
		}
	}

	
}

function selectType( type ){
	data.selectedType = type;
	window.close();
}


window.addEventListener( "load", function(){	

	init();
	
}, false );
