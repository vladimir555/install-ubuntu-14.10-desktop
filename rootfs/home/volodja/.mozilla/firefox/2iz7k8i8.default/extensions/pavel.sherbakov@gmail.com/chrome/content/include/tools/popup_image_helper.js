FVDPopupImageHelper = {
	helperPopupId: "__popupImageHelper",
	
	
	assign: function( elem, imageName ){

		if( elem ){
			elem.addEventListener( "click", function(){
				var popup = document.getElementById(FVDPopupImageHelper.helperPopupId);
				var image = popup.getElementsByTagName( "image" )[0];	
				image.setAttribute("src", "/skin/help_dialogs/" + imageName + ".png");	
				
				popup.openPopup( elem );							
			}, true );
		}
		
	},
	
	assignByClass: function(){
		var elements = document.getElementsByClassName("imageHelper");
		for( var i = 0; i != elements.length; i++ ){
			this.assign( elements[i], elements[i].getAttribute( "helperImage" ) );
		}
	}
}
