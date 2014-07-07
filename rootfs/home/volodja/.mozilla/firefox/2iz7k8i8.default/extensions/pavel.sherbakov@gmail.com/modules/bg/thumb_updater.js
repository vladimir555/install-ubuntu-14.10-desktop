var EXPORTED_SYMBOLS = ["fvd_speed_dial_ThumbUpdater"]; 

Components.utils.import("resource://fvd.speeddial.modules/screen_controller.js");
Components.utils.import("resource://fvd.speeddial.modules/storage.js");

_fvd_speed_dial_ThumbUpdater = function(){
	
	var that = this;
	
	var storage = null;
	
	var Dials = {
		needRefreshDials: true,
		list: [],
		timer: null,
		start: function(){
			
			this.timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);  
			this.timer.initWithCallback(this, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);  
			
		},
		
		notify: function(){			
			if( Dials.needRefreshDials ){
				Dials.needRefreshDials = false;				
				Dials.refreshDials();
			}
		},	
		
		refreshDials: function(){
			var preList = storage.getDialsThumbRefreshData();
			
			this.list = [];
			
			for( var i = 0; i != preList.length; i++ ){
				var interval = preList[i].update_interval;
				if( !interval ){
					continue;
				}
				var seconds = this._intervalStringToSeconds( interval );
				if( !seconds ){
					return false;
				}
				preList[i].periodSeconds = seconds;
				this.list.push( preList[i] );
			}
		},
		
		_intervalStringToSeconds: function( str ){
			var tmp = str.split( "|" );
			if( tmp.length != 2 ){
				return null;
			}
			
			var seconds = null;
			
			switch( tmp[1] ){
				case "minutes":
					seconds = 60 * tmp[0];
				break;
				case "hours":
					seconds = 60 * 60 * tmp[0];
				break;
				case "days":
					seconds = 60 * 60 * 24 * tmp[0];
				break;								
			}
			
			return seconds;
		}
	};
	
	var MainTimer = {
		timer: null,
		notify: function(){			
			
			var now = Math.round(new Date().getTime()/1000);
			
			for( var i = 0; i != Dials.list.length; i++ ){				
				var timeToUpdate = parseInt( Dials.list[i].last_update_time, 10 ) + Dials.list[i].periodSeconds;
					
				if( timeToUpdate < now ){
					Dials.list[i].last_update_time = now;
					fvd_speed_dial_ScreenController.refreshSpeedDialPreview( Dials.list[i].id, {hidden: true} );
				}
				
			}
			
		},	
		start: function(){
			this.timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);  
			this.timer.initWithCallback(this, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);  
		}
	}
	
	var observer = {
		_observer: null,
		events: [
			"FVD.Toolbar-SD-Dial-Updated",
			"FVD.Toolbar-SD-Dial-Added"
		],
		
		start: function(){
			this._observer = Components.classes['@mozilla.org/observer-service;1'].getService(Components.interfaces.nsIObserverService);
			for( var i = 0; i != this.events.length; i++ ){
				this._observer.addObserver(this, this.events[i], false);
			}
		},
		
		observe: function(aSubject, aTopic, aData){
			Dials.needRefreshDials = true;
		}
        
	
		
	};
	
	this.start = function(){
		
		
    	storage = fvd_speed_dial_Storage;		
		observer.start();		
		Dials.start();
		MainTimer.start();
		
	}
	
}


fvd_speed_dial_ThumbUpdater = new _fvd_speed_dial_ThumbUpdater();
