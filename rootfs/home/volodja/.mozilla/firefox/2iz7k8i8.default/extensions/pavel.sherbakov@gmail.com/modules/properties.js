var EXPORTED_SYMBOLS = ["fvd_speed_dial_FVDSSDToolbarProperties"]; 

fvd_speed_dial_FVDSSDToolbarProperties = {
	_bundles: {},
	
	_bundle: function( file ){
		if( !(file in this._bundles) ){
			try{
				var path = 'chrome://fvd.speeddial/locale/'+file+'.properties';
				
				this._bundles[file] = Components.classes['@mozilla.org/intl/stringbundle;1'].getService(Components.interfaces.nsIStringBundleService).createBundle(path);				
			}
			catch( ex ){
				return null;	
			}
		}
		
		return this._bundles[ file ];
	},
	
	getString: function( file, string ){
		var bundle = this._bundle(file);
		
		if( !bundle ){
			return null;
		}
		var txt;
		
		try{
	        txt = bundle.GetStringFromName(string);			
		}
		catch( ex ){
			//dump( "Fail get " + string + " from " + file + "("+ex+")\r\n" );
			txt = string;
		}

		
		return txt;
	},
	
	getIterator: function(file){
		var bundle = this._bundle(file);
		
		if( !bundle ){
			return null;
		}
		
		return bundle.getSimpleEnumeration();
	}
}
