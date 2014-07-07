var PointerFeedback = new function(){
	
	var self = this;
	
	function init(){
		
		var elems = document.getElementsByClassName( "pointerFeedBack" );
		
		for( var i = 0; i != elems.length; i++ ){
			self.initElem( elems[i] );
		}
		
	}	
	
	function setBgColor( elem, color, x, y  ){
		
		var percentX = x/elem.boxObject.width * 100;
		var percentY = y/elem.boxObject.height * 100;		
			
		elem.style.background = "-moz-radial-gradient("+percentX+"% 50%, circle,	rgba("+color+", 0.8) 0%, rgba("+color+", 0.741176) 10px, rgba("+color+", 0.137255) 100%)";
		
	}
	
	this.initElem = function( elem ){
		
		if( elem.hasAttribute( "pointerfeedback_initialized" ) ){
			return;
		}
		
		elem.setAttribute( "pointerfeedback_initialized", 1 )
		
		elem.addEventListener( "mousemove", function( event ){
			
			var pos = {
				x: 0,
				y: 0
			};
			
			var elemPos = elem.getBoundingClientRect(  );
			
			pos.x = event.layerX - elemPos.left;
			pos.y = event.layerY - elemPos.top;				
			
			setBgColor( elem, elem.getAttribute("pointerfbcolor"), pos.x, pos.y );
			
			//dump( "("+pos.x+","+pos.y+")\n" );
			
		}, false );
		
	}
	
	window.addEventListener( "load", function(){
		
		init();
		
	}, false );
	
}
