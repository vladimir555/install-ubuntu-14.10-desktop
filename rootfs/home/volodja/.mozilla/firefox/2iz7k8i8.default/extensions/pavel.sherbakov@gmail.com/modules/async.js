var EXPORTED_SYMBOLS = ["fvd_speed_dial_Async"]; 

fvd_speed_dial_Async = {
	chain: function( callbacksChain ){
		
		var dataObject = {};
		
		var f = function(){
			if( callbacksChain.length > 0 ){
				var nextCallback = callbacksChain.shift();						
				nextCallback( f, dataObject );
			}					
		};
		
		f();
		
	},
	
	arrayProcess: function( dataArray, callback, finishCallback ){
		
		var timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
		
		var f = function( i ){
			
			if( i >= dataArray.length ){
				finishCallback();
			}
			else{
				
				timer.initWithCallback(function(){
						
					callback( dataArray[i], function(){
						f(i + 1);
					} );
					
				}, 0, Components.interfaces.nsITimer.TYPE_ONE_SHOT);

			}
			
		};
		
		f(0);			
		
	}
};
