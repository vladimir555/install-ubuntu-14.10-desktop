FVDColorPicker = {
	frameUrl: "",
	elem: null,
	
	callbacks: [],
	
	start: function( frameUrl ){
		
		this.frameUrl = frameUrl;
		var frame = document.getElementById( "colorPicker" ).getElementsByTagName( "iframe" )[0];
		frame.setAttribute("src", frameUrl);
		
	},
	
	assign: function( elem, callback, callbackOver, callbackOut ){
		if( callback ){
			this.callbacks.push({
				"element": elem,
				"callback": callback,
				"callbackOver": callbackOver,
				"callbackOut": callbackOut
			});
		}
		
		elem.addEventListener( "click", function( event ){
			FVDColorPicker.pick( event.target );
		}, false );
	},
	
	frameWin: function(){
		var frame = document.getElementById( "colorPicker" ).getElementsByTagName( "iframe" )[0];
		return frame.contentWindow;
	},
	
	pick: function( element ){	
		this.elem = element;
				
		var panel = document.getElementById( "colorPicker" );		
		panel.openPopup( element, "after_start", 5, 0, false, false );
		
		if( element.value ){
			this.frameWin().FVDColorPicker.clickColor(element.value);
		}
	},
	
	changeColor: function( color ){
		if( this.elem ){			
			this.elem.value = color;
			
			// search callback
			for( var i = 0; i != this.callbacks.length; i++ ){
				if( this.callbacks[i].element == this.elem ){					
					this.callbacks[i].callback( color );
				}
			}
		}
	},
	
	overColor: function( color ){
		if( this.elem ){	
			// search callback
			for( var i = 0; i != this.callbacks.length; i++ ){
				if( this.callbacks[i].element == this.elem ){	
					if( typeof this.callbacks[i].callbackOver == "function" ){
						this.callbacks[i].callbackOver( color, this.elem );
					}
				}
			}
		}
	},
	
	outColor: function( color ){
		if( this.elem ){			
			// search callback
			for( var i = 0; i != this.callbacks.length; i++ ){
				if( this.callbacks[i].element == this.elem ){	
					if( typeof this.callbacks[i].callbackOut == "function" ){
						this.callbacks[i].callbackOut( color, this.elem );
					}
				}
			}
		}
	},
}
