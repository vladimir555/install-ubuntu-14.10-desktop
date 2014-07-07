var EXPORTED_SYMBOLS = ["fvd_speed_dial_FVDSDSingleMMigrate"];

const FOXTAB_ID = "{ef4e370e-d9f0-4e00-b93e-a4f274cfdd5a}";
const FAST_DIAL_ID = "fastdial@telega.phpnet.us";
const SPEEDDIAL_ID = "{64161300-e22b-11db-8314-0800200c9a66}";
const SUPER_START_ID = "superstart@enjoyfreeware.org";

Components.utils.import("resource://fvd.speeddial.modules/misc.js");

fvd_speed_dial_FVDSDSingleMMigrate = {
	migrateAddonsData: {
	},
	
	addonIds: [FOXTAB_ID, FAST_DIAL_ID, SPEEDDIAL_ID, SUPER_START_ID],
		
	foundAddons: [], // found addons ids
	addonsChecked: false,
	bmsvc: null,
	
	_prefBranch: function(){
		return Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	},
	
	_getFastDialGroupsRecursive: function( folderId ){
		var groups = [];
		
		var itemIndex = -1;
		
		while (true) {
			itemIndex++;
			
			var itemId = this.bmsvc.getIdForItemAt(folderId, itemIndex);
			if (itemId == -1) {
				break;
			}
			
			if( this.bmsvc.getItemType( itemId ) != this.bmsvc.TYPE_FOLDER ){
				continue;
			}
			
			var title = this.bmsvc.getItemTitle( itemId );
	
			groups.push({
				name: title,
				id: itemId
			});
			
			groups = groups.concat( this._getFastDialGroupsRecursive( itemId ) );	
		}
		
		return groups;
	},
	
	_getBMSVC: function(){
		if( this.bmsvc == null ){
			this.bmsvc = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Components.interfaces.nsINavBookmarksService);
		}
		return this.bmsvc;
	},
	
	getImageClassForAddonSmallIcon: function(addonId){
		switch( addonId ){
			case FAST_DIAL_ID:
				return "migrateIcon fastDialSmall";
			break;
			case SPEEDDIAL_ID:
				return "migrateIcon speedDialSmall";			
			break;
			case FOXTAB_ID:
				return "migrateIcon foxTabSmall";			
			break;
			case SUPER_START_ID:
				return "migrateIcon superStartSmall";			
			break;
		}
	},
	
	getImageClassForAddonBigIcon: function(addonId){
		switch( addonId ){
			case FAST_DIAL_ID:
				return "dialBigIcon fastDialImage";
			break;
			case SPEEDDIAL_ID:
				return "dialBigIcon speedDialImage";			
			break;
			case FOXTAB_ID:
				return "dialBigIcon foxTabImage";			
			break;
			case SUPER_START_ID:
				return "dialBigIcon superStartImage";			
			break;
		}
	},
	
	getCountData: function( addonId ){
		
		var data = {
			dials: 0,
			groups: 0
		};			
		
		try{
			var groups = this.getGroups( addonId, function(){} );
						
			if( groups ){
				for( var i = 0; i != groups.length; i++ ){
					var groupDials = this.getDialsList( addonId, groups[i] );
					data.dials += groupDials.length;
				}
			}
			
			data.groups = groups.length;		
		}
		catch( ex ){

			dump("FAIL: " + ex + "\n");

		}
		
		return data;
	},
	
	getGroups: function( addonId, callback ){	
		
		try{
			switch( addonId ){
				case FAST_DIAL_ID:
				
					var bmsvc = this._getBMSVC();
						
					// search fast dial folder
					var itemIndex = -1;
					
					while( true ){
						itemIndex++;
						
						var itemId = bmsvc.getIdForItemAt( bmsvc.bookmarksMenuFolder, itemIndex );
						if( itemId == -1 ){
							break;
						}
						
						if( bmsvc.getItemType( itemId ) != bmsvc.TYPE_FOLDER ){
							continue;
						}
//						
						var title = bmsvc.getItemTitle( itemId );
						
						if( title == "Fast Dial" ){
							var groups = [{
								name: "Default",
								id: itemId
							}];
							var subGroups = this._getFastDialGroupsRecursive( itemId );
							groups = groups.concat( subGroups );
							callback(groups);
							return groups;
						}	
					}
					if( typeof callback == "function" ){
						callback( null );						
					}				
				break;
				
				/* no group dial */
				case FOXTAB_ID:	
					var groups = [{
						id: 0,
						name: "Default"
					}];
				
					if( typeof callback == "function" ){
						callback(groups);							
					}
								
					return groups;
				break;

				/* no group dial */				
				case SUPER_START_ID:	
					var groups = [];
					
					var file = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties).get('ProfD', Components.interfaces.nsIFile);

			        file.append("superstart");
			        file.append("sites.v1.json");
					
					var data = this._readFile(file);	
				
					var preList = JSON.parse(data);
					
					var groupNumber = 1;
						
					groups.push( {
						id: "default",
						name: "Default"
					} );	
						
					for( var i = 0; i != preList.sites.length; i++ ){
						
						var item = preList.sites[i];
						
						if( item.sites ){
							// is group
							groups.push( {
								id: i,
								name: "Group "+groupNumber								
							} );
							groupNumber++;
						}
						
					}
					
					if( typeof callback == "function" ){
						callback(groups);							
					}
								
					return groups;
					
				break;
				
				case SPEEDDIAL_ID:
					var branch = this._prefBranch();
					
					var groups = [];

					var countGroups = 1;
					try{
						countGroups = branch.getIntPref("extensions.speeddial.numGroups");
					}
					catch( ex ){
						
					}
				
					var dialsPosition = 1;
					
					for( groupId = 1; groupId <= countGroups; groupId++ ){
						var group = {
							name: "Default",
							dialsStartsWith: dialsPosition
						};
						try{
							group.cols = branch.getIntPref( "extensions.speeddial.group-"+groupId+"-columns" );
							group.rows = branch.getIntPref( "extensions.speeddial.group-"+groupId+"-rows" );
						}
						catch( ex ){
							break;
						}

						try{
							group.name = this._toUTF16(branch.getCharPref( "extensions.speeddial.group-"+groupId+"-title" ));
						}
						catch( ex ){
							
						}
						
						dialsPosition += group.cols * group.rows;
						
						groups.push( group );
					}
					
					if( typeof callback == "function" ){
						callback(groups);							
					}
								
					return groups;
										
				break;
			}			
		}
		catch( ex ){
			//dump( "Fail get addon groupslist("+ex+")\r\n" );
		}
	},
	
	_md5: function( string ){
        if (!string) return "";

        var array = new Array();
        for (var i = 0; i < string.length; i++) {
            array.push(string.charCodeAt(i));
        }
        var hash = Components.classes["@mozilla.org/security/hash;1"]
                .createInstance(Components.interfaces.nsICryptoHash);
        hash.init(hash.MD5);
        hash.update(array, array.length);
        var binary = hash.finish(false);

        var result = "";
        for (var i = 0; i < binary.length; ++i) {
            var c = binary.charCodeAt(i);
            var ones = c % 16;
            var tens = c >> 4;
            result += String.fromCharCode(tens + (tens > 9 ? 87 : 48)) +
                    String.fromCharCode(ones + (ones > 9 ? 87 : 48));
        }
        return result;
	},
	
	// Read LOCAL file contents, the function do not initiate remote connection.
	
	_readFile: function( file ){
				
		var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
		
		var ios = Components.classes["@mozilla.org/network/io-service;1"].  
		          getService(Components.interfaces.nsIIOService);  
		var URL = ios.newFileURI(file); 
		
		request.open('GET', URL.spec, false);   
		request.send(null);  
		  
		if (request.status == 0)  
			return request.responseText;  
		
		return null;
	},
	
	getImageFile: function( addonId, dial ){
		
		try{
			switch( addonId ){
				case SPEEDDIAL_ID:
				
					var file = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties).get('ProfD', Components.interfaces.nsIFile);
					file.append( "SDThumbs" );
					file.append( "thumbnail-"+dial.id+"-"+dial.lastsaved+".png" );
					if( file.exists() ){
						return file;
					}
					
				break;
				
				case SUPER_START:
				
					var file = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties).get('ProfD', Components.interfaces.nsIFile);
			        file.append("superstart");
			        file.append("snapshots");
								
					if( dial.snapshots && dial.snapshots.length > 0 && dial.snapshotIndex && dial.snapshots[dial.snapshotIndex] ){
						
						file.append( dial.snapshots[dial.snapshotIndex] );
						
						if( file.exists() ){
							return file;
						}
						
					}
					
				break;
				
				case FAST_DIAL_ID:
				
					var file = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties).get('ProfD', Components.interfaces.nsIFile);
					file.append( "fastdial" );
					file.append( "cache" );
					var cacheFolder = file.clone();
					
					var hash = this._md5( dial.url );
				
					file.append( hash );
					if( file.exists() ){
						return file;
					}
					
					var url = dial.url;
					if( url.substr( url.length - 1, 1 ) == "/" ){
						url = url.substr( 0, url.length - 1 );
					}
					hash = this._md5( url );
					
					cacheFolder.append( hash );
					if( cacheFolder.exists() ){
						return cacheFolder;
					}
				
				break;
				
				case FOXTAB_ID:
				
					var file = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties).get('ProfD', Components.interfaces.nsIFile);
					file.append( "foxtab" );
					file.append( "thumbsTS" );
					file.append( dial.fileName + "_S.png" );
					if( file.exists() ){
						return file;
					}
					
				break;
			}
		}
		catch( ex ){
			//dump( "Ex while get image file "+ex+"\r\n" );
		}
		
	},
	
	_toUTF16: function( str ){
		return decodeURIComponent(escape(str));
	},
		
	getDialsList: function( addonId, group, callback ){
		try{
			switch( addonId ){
				case FAST_DIAL_ID:				
					var bmsvc = this._getBMSVC();
					
					var dials = [];
					var itemIndex = -1;
					while (true) {
						itemIndex++;
						
						var itemId = bmsvc.getIdForItemAt(group.id, itemIndex);
						if (itemId == -1) {
							break;
						}
						
						if( bmsvc.getItemType(itemId) != bmsvc.TYPE_BOOKMARK ){
							continue;
						}
						
						dials.push({
							title: bmsvc.getItemTitle( itemId ),
							url: bmsvc.getBookmarkURI( itemId ).spec
						});
					}
					if( typeof callback == "function" ){
						callback(dials);						
					}
					
					return dials;
				
				break;
				
				case FOXTAB_ID:					
					var file = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties).get('ProfD', Components.interfaces.nsIFile);
			        file.append("foxtab");
			        file.append("data");
					file.append("topSites.json");
					
					var data = this._readFile(file);
					
					var preList = JSON.parse(data);
					
					if( typeof callback == "function" ){
						callback( preList );					
					}						
					
					return preList;										
				break;
				
				case SUPER_START_ID:			
						
					var file = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties).get('ProfD', Components.interfaces.nsIFile);

			        file.append("superstart");
			        file.append("sites.v1.json");
					
					
					var data = this._readFile(file);	
				
					var preList = JSON.parse(data);
					
					var dialsGroupped = {
						"default": []
					};
					
					function _analyzeGroup( items, id ){
						
						for( var i = 0; i != items.length; i++ ){
							var item = items[i];
							if( item.url == "about:placeholder" ){
								continue;
							}
							
							if( item.sites ){
								_analyzeGroup( item.sites, i );
							}
							else{
								// is dial
								if( !dialsGroupped[id] ){
									dialsGroupped[id] = [];
								}
								dialsGroupped[id].push( item );
							}
						}
						
					}
					
					_analyzeGroup( preList.sites, "default" );
									
					var list = [];
					if( dialsGroupped[group.id] ){
						list = dialsGroupped[group.id];
					}
										
					if( typeof callback == "function" ){
						callback( list );					
					}						
					
					return list;										
				break;
				
				case SPEEDDIAL_ID:
				
					var dialsCount = group.rows * group.cols;
					var dialsStartsWith = group.dialsStartsWith;
					
					var branch = this._prefBranch();
					
					var dials = [];
					
					for( var i = 0; i != dialsCount; i++ ){
						var dialId = dialsStartsWith + i;
						var dial = {};
						try{
							dial.title = this._toUTF16(branch.getCharPref( "extensions.speeddial.thumbnail-"+dialId+"-label" ));
							dial.url = branch.getCharPref( "extensions.speeddial.thumbnail-"+dialId+"-url" );
							dial.lastsaved = branch.getCharPref( "extensions.speeddial.thumbnail-"+dialId+"-lastsaved" );
							dial.id = dialId;
							
							try{
								var thumbSourceUrl = branch.getCharPref( "extensions.speeddial.thumbnail-"+dialId+"-thumbnailurl" );
								
								if( thumbSourceUrl.toLowerCase().indexOf( "file:///" ) == 0 ){

									dial.previewInfo = {
										localFile: fvd_speed_dial_Misc.fileURIToPath( thumbSourceUrl )
									};											
			

								}
							}
							catch( ex ){
								
							}
														
							if( dial.url.toLowerCase().indexOf("http") != 0 ){
								continue;
							}
							
							dials.push( dial );
						}
						catch( ex ){
							
						}						
					}
					
					if( typeof callback == "function" ){
						callback( dials );			
					}		
					
					
					return dials;
					
				break;
			}			
		}
		catch( ex ){			
			dump( "Fail get addon dials list("+ex+")\r\n" );
		}		
	},
	
	checkMigration: function(){
		
		var that = this;
				
		try {	
			if( this.addonsChecked ){
				return false;
			}
			
			//dump("START MIGRATION CHECK!\r\n");
		
			this.addonsChecked = true;	    
		    Components.utils.import("resource://fvd.speeddial.modules/addonmanager.js");
		    
			for( var i = 0; i != this.addonIds.length; i++ ){		
				var addonId = this.addonIds[i];
									
				AddonManager.getAddonByID( addonId, function( addon ){
					
					if( addon != null){
						
						dump( "FOUND! " + addonId + "\n" );
						
						try{
							var counts = that.getCountData( addon.id );
							
							dump( counts.dials + "\n" );
							
							if( counts.dials == 0 ){
								return;
							}
						}
						catch( ex ){
							dump( "Fail get: " + ex + "\n" );
						}
						
						
						fvd_speed_dial_FVDSDSingleMMigrate.foundAddons.push( addon.id );
						if( !fvd_speed_dial_FVDSDSingleMMigrate.migrateAddonsData[addon.id] ){
							fvd_speed_dial_FVDSDSingleMMigrate.migrateAddonsData[addon.id] = {};
						}
						fvd_speed_dial_FVDSDSingleMMigrate.migrateAddonsData[addon.id].name = addon.name + " ("+addon.version+")";
						var icon = null;
						if( addon.iconURL ){
							icon = addon.iconURL;
						}
						fvd_speed_dial_FVDSDSingleMMigrate.migrateAddonsData[addon.id].icon = icon;
						
						
					}
				} );
				
			}
		} 
		catch (e) {
			//dump( "Migration check failed ("+ex+")\r\n" );
		}
	}
}
