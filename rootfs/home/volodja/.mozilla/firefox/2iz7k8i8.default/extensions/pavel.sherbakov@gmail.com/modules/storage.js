var EXPORTED_SYMBOLS = ["fvd_speed_dial_Storage"];

Components.utils.import("resource://fvd.speeddial.modules/properties.js");
Components.utils.import("resource://fvd.speeddial.modules/settings.js");
Components.utils.import("resource://fvd.speeddial.modules/async.js");
Components.utils.import("resource://fvd.speeddial.modules/misc.js");



Components.utils.import("resource://gre/modules/NetUtil.jsm");  
Components.utils.import("resource://gre/modules/FileUtils.jsm");  

const SETTINGS_KEY_BRANCH = 'extensions.fvd_speed_dial.';
const DB_FILE = "db_sd.sqlite";
const STORAGE_FOLDER = 'FVD Toolbar';
const SPEED_DIAL_SCREENSHOTS_DIRECTORY = "sd";
const SYNC_DATA_DIRECTORY = "SyncData";

const INIT_DIALS = [

	{
		group: {
		  name: fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.first_group_name" ),
		  global_id: "default",
		  sync: 1
		},
		dials:[
			{
				url: "https://addons.mozilla.org/",
				thumb_url: "https://s3.amazonaws.com/fvd-data/sdpreview/0/6e9f3e8d/1377510722-521b254232bf0/preview.png",
				global_id: "6e9f3e8d"
			},
			{
				url: "https://google.com",
				thumb_url: "https://s3.amazonaws.com/fvd-data/sdpreview/0/e14f0993/1377507760-521b19b0a728d/preview.png",
        global_id: "e14f0993"
			},
			{
				url: "http://facebook.com",
				thumb_url: "https://s3.amazonaws.com/fvd-data/sdpreview/0/22ae9a07/1377549791-521bbddf9dc9b/preview.png",
        global_id: "22ae9a07"
			},
			{
				url: "http://twitter.com",
				thumb_url: "https://s3.amazonaws.com/fvd-data/sdpreview/0/f125b86e/1377503184-521b07d0319ef/preview.png",
        global_id: "f125b86e"
			},
			{
				url: "http://amazon.com",
				thumb_url: "https://s3.amazonaws.com/fvd-data/sdpreview/0/2060fdd1/1377466564-521a78c4f166f/preview.png",
        global_id: "2060fdd1"
			},
			{
				url: "http://www.ebay.com/",
				thumb_url: "https://s3.amazonaws.com/fvd-data/sdpreview/0/d70b5c2/1377504927-521b0e9fb4575/preview.png",
        global_id: "d70b5c2"
			}			
		]	
	}

];

const DEFAULT_DIALS_FILE = "chrome://fvd.speeddial/content/data/sd_dials.txt";

const MAX_URIS_IN_HISTORY_QUERY = 1000;


// EVENTS:
/*
 * FVD.Toolbar-SD-Deny-Updated
 * FVD.Toolbar-SD-Group-Updated
 * FVD.Toolbar-SD-Group-Added
 * FVD.Toolbar-SD-Group-Removed
 * 
 * FVD.Toolbar-SD-MostVisited-Removed-Cleared
 * FVD.Toolbar-SD-Dial-Updated
 * FVD.Toolbar-SD-Dial-Added
 */




// singleton class
function FVD_TOOLBAR_SD_STORAGE(){
	
	var self = this;
	
	this.connection = null;
	this.observer = null; // for sending messages	
	
	this.registry = null;
	this.timer = null;	
	
	this.mostVisitedCache = {
		
	}, 
	this.mostVisitedCacheGrouppedByDomain = {
		
	};
	this.denyCache = null;
	
	this.mostVisitedRemovedCache = null;
	
	this.defaultDialsCache = null;
	
	this._mostVisitedCacheLifeTime = null;
	
	this.DELAY_DEFAULT = 1;
	this.DISABLE_PLUGINS_DEFAULT = 1;
	
	this.isImportFromJSONAsync = true;
	
	this._cache = {};
	
	this._getFromCache = function( key ){
		if( this._cache[key] ){
			return this._cache[key];
		}
		return null;
	};
	
	this._setToCache = function( key, value ){
		this._cache[key] = value;
	};
	
	this._flushCache = function(){
		this._cache = {};
	};
	
	this.flushCache = function(){
		this._flushCache();
	};
		
		
	var _dialFieldsToSelect = [
		"rowid",
		"url",
		"title",
		"thumb_src",
		"thumb_source_type",
		"thumb_update_date",
		"position",
		"deny",
		"clicks",
		"group_id",
		"use_js",
		"hand_changed",
		"disable_plugins",
		"status",
		"thumb_width",
		"thumb_height",
		"restore_previous_thumb",
		"ignore_restore_previous_thumb",
		"manually_cropped"
	];	
	
	function _getDialsFieldsToSelect(){
		return _dialFieldsToSelect.concat( [] );
	}
		
	this._createTables = function(){
		
		var foundTables = [];
		var foundIndexes = [];
		
		var statement = this.connection.createStatement( "SELECT `name`, `type` FROM sqlite_master" );
		var foundFields = [];
		while( statement.executeStep() ){
			
			switch( statement.row.type ){
				case "table":
					foundTables.push( statement.row.name );
				break;
				case "index":
					foundIndexes.push( statement.row.name );					
				break;				
			}

		}
			
			
		var foundNotExistsTables = false;	
		
		if( !this.connection.tableExists("dials_groups") ){
			
			foundNotExistsTables = true;
			
			try{
				this.connection.executeSimpleSQL("CREATE TABLE `dials_groups` (" + 
" `name` VARCHAR( 64 ) NULL, " + 
" `position` INT," + 
" `global_id` VARCHAR(64)," + 
" `sync` INT DEFAULT 1" + 
");");			
			
			}	
	 		catch( ex ){
				//dump( "Fail create tables: " + ex + "\r\n" );
			}
		}
		else{
			var requiredFields = [
				{
					name: "global_id",
					query: "ALTER TABLE `dials_groups` ADD COLUMN `global_id` VARCHAR(64)"						
				},
				{
					name: "sync",
					query: "ALTER TABLE `dials_groups` ADD COLUMN `sync` INT DEFAULT 1"						
				}				
			];
			
			var statement = this.connection.createStatement( "pragma table_info(dials_groups)" );
			var foundFields = [];
			while( statement.executeStep() ){
				foundFields.push( statement.row.name );
			}
			
			for( var i = 0; i != requiredFields.length; i++ ){
				if( foundFields.indexOf(requiredFields[i].name) == -1 ){
					this.connection.executeSimpleSQL( requiredFields[i].query );
				}
			}
		}
		
		if( !this.connection.tableExists("dials") ){
			
			foundNotExistsTables = true;
			
			// TODO CHECK FOR LOCAL FILES - UPLOAD ONLY IF IT'S LOCATION CHANGED
			
			try{
				this.connection.executeSimpleSQL("CREATE TABLE `dials` (" + 
"`title` VARCHAR( 255 ) NULL ," + 
"`thumb_src` VARCHAR( 2048 ) NULL ," +  
"`url` VARCHAR( 2048 ) NOT NULL ," + 
"`thumb_url` VARCHAR( 2048 ) NOT NULL ," + 
"`thumb_source_type` VARCHAR( 10 ) NOT NULL ," + 
"`thumb_update_date` DATETIME NULL," + 
"`position` INT," + 
"`group_id` INT," + 
"`clicks` INT," + 
"`deny` INT," + 
"`use_js` INT DEFAULT 0," + 
"`hand_changed` INT DEFAULT 0," + 
"`delay` INT,"+
"`disable_plugins` INT,"+
"`status` VARCHAR(16),"+
"`thumb_width` INT,"+
"`thumb_height` INT,"+
"`update_interval` VARCHAR(64),"+
"`last_update_time` INT,"+
"`restore_previous_thumb` INT,"+
"`ignore_restore_previous_thumb` INT,"+
"`global_id` VARCHAR(64),"+
"`manually_cropped` INT,"+
"`need_sync_screen` INT"+
");");	

				
			}	
	 		catch( ex ){
				//dump( "Fail create tables: " + ex + "\r\n" );
						
			}
		}
		else{

			var requiredFields = [
				{
					name: "thumb_width",
					query: "ALTER TABLE `dials` ADD COLUMN `thumb_width` INT"						
				},
				{
					name: "thumb_height",
					query: "ALTER TABLE `dials` ADD COLUMN `thumb_height` INT"						
				},
				{
					name: "update_interval",
					query: "ALTER TABLE `dials` ADD COLUMN `update_interval` VARCHAR(64)"
				},
				{
					name: "last_update_time",
					query: "ALTER TABLE `dials` ADD COLUMN `last_update_time` INT"
				},
				{
					name: "restore_previous_thumb",
					query: "ALTER TABLE `dials` ADD COLUMN `restore_previous_thumb` INT"
				},
				{
					name: "ignore_restore_previous_thumb",
					query: "ALTER TABLE `dials` ADD COLUMN `ignore_restore_previous_thumb` INT"
				},
				{
					name: "global_id",
					query: "ALTER TABLE `dials` ADD COLUMN `global_id` VARCHAR(64)"
				},
				{
					name: "manually_cropped",
					query: "ALTER TABLE `dials` ADD COLUMN `manually_cropped` INT"
				},
				{
					name: "need_sync_screen",
					query: [
						"ALTER TABLE `dials` ADD COLUMN `need_sync_screen` INT",
						"UPDATE `dials` SET `need_sync_screen` = 1 WHERE `thumb_source_type` = 'local_file'"
					]
				},
				
			];
			
			var requiredIndexes = [
				{
					name: "index_dials_global_id",
					query: "CREATE INDEX `index_dials_global_id` ON `dials` (`global_id`)"
				},
				{
					name: "index_dials_deny_group_id",
					query: "CREATE INDEX `index_dials_deny_group_id` ON `dials` (`deny`,`group_id`)"
				},
			];
			
			var statement = this.connection.createStatement( "pragma table_info(dials)" );
			var foundFields = [];
			while( statement.executeStep() ){
				foundFields.push( statement.row.name );
			}
			
			for( var i = 0; i != requiredFields.length; i++ ){
				if( foundFields.indexOf(requiredFields[i].name) == -1 ){
					var toExec = requiredFields[i].query;
					
					if( !(toExec instanceof Array) ){
						toExec = [toExec];
					}
				
					for( var j = 0; j != toExec.length; j++ ){
						dump( "\n\n\nEXECCC: " + toExec[j] + "\n\n\n" );
						
						this.connection.executeSimpleSQL( toExec[j] );							
					}
				}
			}
			
			requiredIndexes.forEach( function( indexInfo ){
				
				if( foundIndexes.indexOf( indexInfo.name ) == -1 ){
					self.connection.executeSimpleSQL( indexInfo.query );
				}
				
			} );

		}
		
		if( !this.connection.tableExists("deny") ){
			
			foundNotExistsTables = true;
			
			try{
				this.connection.executeSimpleSQL("CREATE TABLE `deny` (" + 
"`sign` VARCHAR( 1024 ) NULL ,"+
"`effective_sign`,"+
"`type` VARCHAR( 20 ) NULL"+
");");			
			}	
	 		catch( ex ){
				//dump( "Fail create tables: " + ex + "\r\n" );
			}
		}

		if( !this.connection.tableExists("most_visited_removed_uris") ){
			
			try{
				this.connection.executeSimpleSQL("CREATE TABLE `most_visited_removed_uris` ("+
"`uri` VARCHAR( 1024 ) NULL "+
");");			
			}	
	 		catch( ex ){
				//dump( "Fail create tables: " + ex + "\r\n" );
			}
		}
		
		if( !this.connection.tableExists("most_visited_modified_urls") ){
			
			try{
				this.connection.executeSimpleSQL("CREATE TABLE `most_visited_modified_urls` ("+
"`url` VARCHAR( 2048 ) NOT NULL UNIQUE,"+
"`thumb_url` VARCHAR( 2048 ),"+
"`thumb_source_type` VARCHAR( 10 ),"+
"`title` VARCHAR( 255 ),"+
"`hand_changed` INT DEFAULT 0,"+
"`use_js` INT DEFAULT 0,"+
"`delay` INT,"+
"`disable_plugins` INT,"+
"`have_preview` INT,"+
"`status` VARCHAR(16),"+
"`thumb_width` INT,"+
"`thumb_height` INT"+
");");			
			}	
	 		catch( ex ){
				//dump( "Fail create tables: " + ex + "\r\n" );
			}
		}
		else{
			var requiredFields = [
				{
					name: "thumb_width",
					query: "ALTER TABLE `most_visited_modified_urls` ADD COLUMN `thumb_width` INT"						
				},
				{
					name: "thumb_height",
					query: "ALTER TABLE `most_visited_modified_urls` ADD COLUMN `thumb_height` INT"						
				}
			];
			
			var statement = this.connection.createStatement( "pragma table_info(most_visited_modified_urls)" );
			var foundFields = [];
			while( statement.executeStep() ){
				foundFields.push( statement.row.name );
			}
			
			for( var i = 0; i != requiredFields.length; i++ ){
				if( foundFields.indexOf(requiredFields[i].name) == -1 ){
					this.connection.executeSimpleSQL( requiredFields[i].query );
				}
			}
		}
		
		if( foundNotExistsTables ){
			
			var that = this;
			
			INIT_DIALS.forEach(function( group ){
				
				var groupId = that.addGroup( group.group );
				
				// insert some init dials
				for( var i = 0; i != group.dials.length; i++ ){
					
					var dial = group.dials[i];
					
					var thumb_source_type = null;
					var thumb_url = null;
					var url = null;
					
					if( typeof dial == "object" ){
						thumb_source_type = "force_url";
						thumb_url = dial.thumb_url;
						url = dial.url;
					}
					else{
						url = dial;
					}					
					that.add( url, "", thumb_source_type, thumb_url, groupId, 1, 0, /*delay*/1, /*disable_plugins*/1, null, null, dial.global_id );	
				}	
				
			});
			

			
		}


		
	};
	
		
	
	this._getDomain = function (url) {
 		return url.match(/:\/\/(.[^\/]+)/)[1].replace('www.','');
	};
	
	// Read LOCAL file contents, the function do not initiate remote connection.
	
    this._get_file_contents = function(file_url){
        try {
            var ajax = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance(Components.interfaces.nsIXMLHttpRequest);
            ajax.open('GET', file_url, false);
            ajax.overrideMimeType('text/plain');
            ajax.send(null);
            
            return ajax.responseText;
        } 
        catch (ex) {
            return "";
        }
        
    };
	
	this._get_file_contents_async = function( file_url, callback ){
        try {
            var ajax = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance(Components.interfaces.nsIXMLHttpRequest);
            ajax.open('GET', file_url, true);
			ajax.overrideMimeType("text/plain; charset=x-user-defined");
			
			ajax.onload = function(){				
				callback(ajax.responseText);
			};
			ajax.onerror = function(){
				callback(null);
			};
			
            ajax.send(null);
        } 
        catch (ex) {
            return "";
        }
	};
	
	/* Async functions for sync */
	
	this.asyncFixDialsPositions = function( groupId, callback ){
		
		var query = {
			query: "SELECT `rowid` FROM `dials` WHERE `group_id` = :group_id ORDER BY `position`",
			params: { group_id: groupId }
		};		
		
		self.asyncCustomQuery( query, ["rowid"], function( dials ){
			
			var position = 1;
			
			fvd_speed_dial_Async.arrayProcess( dials, function( dial, arrayProcessCallback ){
				
				var query = {
					query: "UPDATE `dials` SET `position` = :position WHERE `rowid` = :rowid",
					params: { position: position, rowid: dial.rowid }
				};
				
				position++;
				
				self.asyncCustomQuery( query, [], function(){
					arrayProcessCallback();
				} );
				
			}, function(){
				callback();
			} );
			
		} );
		
	};
	
	this.asyncFixGroupsPositions = function( callback ){
		
		var query = "SELECT `rowid` FROM `dials_groups` ORDER BY `position`";
		self.asyncCustomQuery( query, ["rowid"], function( groups ){
			
			var position = 1;
			
			fvd_speed_dial_Async.arrayProcess( groups, function( group, arrayProcessCallback ){
				
				var query = {
					query: "UPDATE `dials_groups` SET `position` = :position WHERE `rowid` = :rowid",
					params: { position: position, rowid: group.rowid }
				};
				
				position++;
				
				self.asyncCustomQuery( query, [], function(){
					arrayProcessCallback();
				} );
				
			}, function(){
				callback();
			} );
			
		} );
		
	};
	
	this.asyncRemoveGroupsNotInListForSync = function( globalIds, callback ){
		
		//dump( "Start remove groups not in list\n" );
		
		var countRemovedGroups = 0;
		
		this.asyncCustomQuery( "SELECT `global_id`, `rowid` FROM `dials_groups` WHERE `sync` = 1", ["global_id", "rowid"], function( currentGlobalIds ){
			
			//dump( "Found groups: " + currentGlobalIds.length + "\n" );
			
			fvd_speed_dial_Async.arrayProcess( currentGlobalIds, function( group, arrayProcessCallback ){
								
				if( globalIds.indexOf( group.global_id ) == -1 ){
					
					//dump( "REMOVE GROUP\n" );
					
					countRemovedGroups++;
					
					self.asyncRemoveGroup( group.rowid, function(){
						arrayProcessCallback();
					} );					
				}
				else{
					
					//dump( "Group found: " + group.global_id + "\n"  );
					
					arrayProcessCallback();
				}
				
			}, function(){
				callback( countRemovedGroups );
			} );
			
		});
		
	};
	
	this.asyncRemoveGroup = function( groupId, callback ){
		
		var query = {
			query: "DELETE FROM `dials_groups` WHERE `rowid` = :rowid",
			params: {rowid: groupId}
		};
		
		this.asyncCustomQuery( query, null, function(){
			
			query = {
				query: "SELECT rowid FROM `dials` WHERE `group_id` = :group_id",
				params: {group_id: groupId}
			};		
			
			self.asyncCustomQuery( query, ["rowid"], function( dials ){
				
				fvd_speed_dial_Async.arrayProcess( dials, function( dial, arrayProcessCallback ){
					self.asyncRemoveDial( dial.rowid, function(){
						arrayProcessCallback();
					} );					
				}, function(){
					callback();
				} );
				
			});
			
		} );
		
	},
	
	
	this.asyncUpdateGroupForSync = function( clientGroup, serverGroup, callback ){
		
		// update global_id for group
		
		var query = {
			query: "UPDATE `dials_groups` SET `global_id` = :global_id WHERE `rowid` = :rowid",
			params: { global_id: serverGroup.global_id, rowid: clientGroup.rowid }
		};
		
		//dump( "Update group set " + serverGroup.global_id + ", for " + clientGroup.rowid + "\n" );
		
		this.asyncCustomQuery( query, null, callback );
	};
	
	this.asyncSaveGroupForSync = function( group, callback ){
		
		fvd_speed_dial_Async.chain( [
			function( _chainCallback ){
				
				self.canSyncGroup( group.global_id, function( can ){
										
					if( can ){
						_chainCallback();
					}
					else{
						callback();
					}
					
				} );
				
			},
			function(){
				
				self.asyncGroupExistsForSync( group.global_id, function( exists ){
					
					if( exists ){
						//dump( "Update group: " + group.global_id + "\n" );
						
						// update group
						var query = {
							query: "UPDATE `dials_groups` SET `name` = :name, `position` = :position WHERE `global_id` = :global_id",
							params: {name: group.name, global_id: group.global_id, position: group.position}
						};
						
						self.asyncCustomQuery( query, null, function(){
							callback();
						} );
					}
					else{
						//dump( "Add group: " + group.global_id + "\n" );
						
						// add group
		
						//self.asyncGroupNextPosition( function( nextPosition ){
						var query = {
							query: "INSERT INTO `dials_groups`(`name`, `position`, `global_id`) VALUES(:name, :position, :global_id)",
							params: { name: group.name, position: group.position, global_id:group.global_id }					
						};
							
						self.asyncCustomQuery( query, null, function(){
							callback();
						} );		
						//} );
		
					}
					
				} );
				
			}
		] );

		
	};
	
	this.asyncGroupExistsForSync = function( globalId, callback ){
		
		var query = {
			query: "select exists(select * from `dials_groups` where `global_id` = :global_id) as group_exists",
			params: {global_id: globalId}
		};
		
		this.asyncCustomQuery( query, ["group_exists"], function( result ){
			
			var exists = false;
			
			try{
				exists = result[0].group_exists == 1;
			}
			catch( ex ){
				
			}
			
			callback( exists );
			
		} );
		
	};
	
	this.asyncGroupIdForSync = function( globalId, callback ){
		
		var query = {
			query: "select `rowid` FROM `dials_groups` WHERE `global_id` = :global_id",
			params: {global_id: globalId}
		};
		
		this.asyncCustomQuery( query, ["rowid"], function( result ){
			
			var id = 0;
			
			try{
				id  = result[0].rowid;
			}
			catch( ex ){
				
			}
			
			callback( id );
			
		} );
		
	};
	
	this.asyncRemoveDialsNotInListForSync = function( globalIds, callback ){
		
		var removeInfo = {
			count: 0,
			removedFromGroups: []
		}; // describes remove process info
		
		this.asyncCustomQuery( "SELECT `global_id`, `rowid`, `group_id` FROM `dials` WHERE (SELECT `dials_groups`.`sync` FROM `dials_groups` WHERE `dials_groups`.`rowid` = `dials`.`group_id`) = 1", ["global_id", "rowid", "group_id"], function( currentGlobalIds ){
			
			fvd_speed_dial_Async.arrayProcess( currentGlobalIds, function( dial, arrayProcessCallback ){
				
				if( globalIds.indexOf( dial.global_id ) == -1 ){
					
					removeInfo.count++;
					removeInfo.removedFromGroups.push( dial.group_id );
					
					self.asyncRemoveDial( dial.rowid, function(){
						arrayProcessCallback();
					} );					
				}
				else{
					arrayProcessCallback();
				}
				
			}, function(){
				callback( removeInfo );
			} );
			
		});
		
	};
		
	
	this.asyncUpdateDialForSync = function( clientDial, serverDial, callback ){
		
		// first set global_id as on server
		var query = {
			query: "UPDATE `dials` SET `global_id` = :new_global_id WHERE `global_id` = :global_id",
			params: { global_id: clientDial.global_id, new_global_id: serverDial.global_id }
		};
		
		this.asyncCustomQuery( query, null, function(){
			
			// save dial data
			self.asyncSaveDialForSync( serverDial, function(){
				callback();
			} );
			
		} );
	};
	
	this.asyncSaveDialForSync = function( dial, callback, ignoreNoSync ){
		
		Components.utils.import("resource://fvd.speeddial.modules/screen_controller.js");
		
		var oldData = null;
		var nullThumbSrc = false;
		
		var saveInfo = {}; // describes dial info with it saves
		
		fvd_speed_dial_Async.chain( [
			/*
			function( _chainCallback ){
				
				if( !ignoreNoSync ){
					self.canSyncDial( dial.global_id, function( can ){
						
						if( can ){
							_chainCallback();
						}
						else{
							callback( null );
						}
						
					} );					
				}
				else{
					chainCallback();
				}
				
			},
			
			function( _chainCallback ){
				
				self.canSyncGroup( dial.group_global_id, function( can ){
					
					if( can ){
						_chainCallback();
					}
					else{
						callback( null );
					}
					
				} );
				
			},
			*/
			function(){				
				
				self.asyncDialExistsForSync( dial.global_id, function( exists ){
					
					self.asyncGroupIdForSync( dial.group_global_id, function( groupId ){
						
						if( groupId == 0 ){
							callback( null ); // cannot add dial, group not found
						}
						else{
							dial.group_id = groupId;
							
							saveInfo.group_id = groupId;
							
							var deny = self.isDenyUrl( dial.url ) ? 1 : 0;
							
							fvd_speed_dial_Async.chain( [
								
								function( chainCallback ){
									
									// process manually cropped		
									
									// for url screen dials which manually cropped
									dial.manually_cropped = 0;
																
									if( dial._previewUrl && dial.thumb_source_type == "url" ){
										
										dial.manually_cropped = 1;										
										dial.thumb_source_type = "local_file";
										
										chainCallback();
										
									}
									else{
										chainCallback();	
									}									
									
								},
								
								function( chainCallback ){
									
									if( exists ){
										
										var query = {
											query: "SELECT `thumb_source_type`, `thumb_url`, `thumb_src`, `url`, `group_id` FROM `dials` WHERE `global_id` = :global_id",
											params: {global_id: dial.global_id}
										};
										
										self.asyncCustomQuery( query, ["thumb_source_type", "thumb_url", "thumb_src", "url", "group_id"], function( result ){
											
											if( result.length > 0 ){
												
												oldData = result[0];
												
												// check if dials moved
												
												if( oldData.group_id != dial.group_id ){
													saveInfo.move = {
														from: oldData.group_id,
														to: dial.group_id
													};
												}
																					
												if( oldData.thumb_source_type != dial.thumb_source_type ){
													nullThumbSrc = true;
												}
												else{
													
													if( dial.thumb_source_type == "url" ){
														if( dial.url != oldData.url ){
															nullThumbSrc = true;
														}
													}
													else if( dial.thumb_source_type == "force_url" ){
														if( dial.thumb_url != oldData.thumb_url ){
															nullThumbSrc = true;
														}	
													}
													else if( dial.thumb_source_type == "local_file" ){
														
														if( dial._previewContent ){
															var newContentMd5 = fvd_speed_dial_Misc.md5( dial._previewContent );
															
															var tmp = oldData.thumb_url.split( /[\/\\]/ );
															var fileName = tmp[tmp.length - 1];
															
															if( fileName.indexOf( newContentMd5 ) == -1 ){
																nullThumbSrc = true;
															}
														}
														
													}
													
													
												}
												
												if( nullThumbSrc ){
													dial.thumb_src = null;									
												}
												else{
													dial.thumb_src = oldData.thumb_src;
												}
												
												chainCallback();										
													
											}
											else{
												chainCallback();
											}									
											
										} );
										
									}
									else{
										chainCallback();
									}
									
								},
								
								function( chainCallback ){
									if( exists ){
										
										//dump( "UPDATE dial " + dial.global_id + "\n" );
										
										//dump( "UPPDATE DIAL " + JSON.stringify ( dial ) + "\n" );
										
										query = {										
											query: "UPDATE `dials` SET `url` = :url, `title` = :title, `thumb_url` = :thumb_url, " + 
												"thumb_source_type = :thumb_source_type, use_js = :use_js, hand_changed = :hand_changed, " +
												"disable_plugins = :disable_plugins, thumb_width = :thumb_width, thumb_height = :thumb_height, group_id = :group_id, " +
												"`delay` = :delay, `deny` = :deny, `thumb_src` = :thumb_src, `position` = :position, `update_interval` = :update_interval, " +
												"`manually_cropped` = :manually_cropped " +
												"WHERE `global_id` = :global_id",
											params: { url: dial.url, title: dial.title, thumb_url: dial.thumb_url, thumb_source_type: dial.thumb_source_type, use_js: dial.use_js,
													  hand_changed: dial.hand_changed, disable_plugins: dial.disable_plugins, thumb_width: dial.thumb_width, thumb_height: dial.thumb_height,
													  group_id: dial.group_id, global_id: dial.global_id, delay: dial.delay, deny: deny, thumb_src: dial.thumb_src, 
													  position: dial.position, update_interval: dial.update_interval, manually_cropped: dial.manually_cropped }
													  
										};
																		
										self.asyncCustomQuery( query, null, function(){
											chainCallback();
										} );
										
									}
									else{				
										
										//dump( "ADD dial " + dial.global_id + "\n" );
										
										//self.asyncNextPosition( dial.group_id, function( nextPosition ){
											
										query = {										
											query: "INSERT INTO `dials` (`url`, `title`, `thumb_url`, `thumb_source_type`, `use_js`, `hand_changed`, `disable_plugins`, "+
													"`thumb_width`, `thumb_height`, `group_id`, `global_id`, "+
													"`delay`, `clicks`, `deny`, `position`, `update_interval`, `manually_cropped`) "+
													"VALUES( :url, :title, :thumb_url, :thumb_source_type, :use_js, :hand_changed, :disable_plugins, :thumb_width, :thumb_height, "+
													":group_id, :global_id, :delay, 0, :deny, :position, :update_interval, :manually_cropped )",
											params: { url: dial.url, title: dial.title, thumb_url: dial.thumb_url, thumb_source_type: dial.thumb_source_type, 
											position: dial.position, use_js: dial.use_js,
													  hand_changed: dial.hand_changed, disable_plugins: dial.disable_plugins, thumb_width: dial.thumb_width,
													  thumb_height: dial.thumb_height,
													  group_id: dial.group_id, global_id: dial.global_id, delay: dial.delay, deny: deny, update_interval: dial.update_interval,
													  manually_cropped: dial.manually_cropped}
										};
										
										self.asyncCustomQuery( query, null, function(){
											chainCallback();
										} );
											
										//} );
										
									}
								},
								
								function( chainCallback ){									
									
									if (dial.thumb_source_type == "local_file") {
									
										self.asyncDialIdByGlobalId(dial.global_id, function(dialId){
										
											if (dialId != null) {
																	
												if( oldData ){
													var tmp = oldData.thumb_url.split( /[\/\\]/ );
													var fileName = tmp[tmp.length - 1];
													
													try{
														self.removeSyncDataFile( fileName );											
													}
													catch( ex ){
														
													}
												}
												
												function _zeroThumbSrc( newPath ){
													if( nullThumbSrc || !oldData || oldData.thumb_url == newPath ){
														return "";
													}														
													
													return "`thumb_src` = 0, ";
												}
												
												if( dial._previewContent ){
													self.asyncPutDialPreviewBase64InFile(dialId, dial._previewContent, null, function( localPath ){
														
														// need update dial local path
														var zrThSrc = _zeroThumbSrc( localPath );
														
														var  query = {
															query: "UPDATE `dials` SET "+zrThSrc+"`thumb_url` = :thumb_url WHERE `rowid` = :rowid",
															params: { thumb_url: localPath, rowid: dialId }
														};
														
														self.asyncCustomQuery( query, null, function(){
															
															if( zrThSrc ){
																fvd_speed_dial_ScreenController.refreshSpeedDialPreview( dialId );	
															}
															
															chainCallback();
														} );											
														
													});	
												}
												else if( dial._previewUrl ){
													
													//dump("try to get preview url: " + dial._previewUrl + "\n");
																									
													self.asyncPutDialPreviewImageInFile(dialId, dial._previewUrl, null, function( localPath ){
														
														// need update dial local path
														var zrThSrc = _zeroThumbSrc( localPath );
														
														var  query = {
															query: "UPDATE `dials` SET "+zrThSrc+"`thumb_url` = :thumb_url WHERE `rowid` = :rowid",
															params: { thumb_url: localPath, rowid: dialId }
														};
																											
														self.asyncCustomQuery( query, null, function(){
																														
															if( zrThSrc ){																
																fvd_speed_dial_ScreenController.refreshSpeedDialPreview( dialId );	
															}
															
															chainCallback();
														} );											
														
													});	
													
												}
												else{
													chainCallback();
												}
												
											}
											else{
												chainCallback();
											}
											
										});
										
									}
									else{
										chainCallback();
									}
									
									
								},
								function(){
									callback( saveInfo );
								}
								
							] );
							
							
							
						}
						
					} );
					
		
					
				} );			
				
				
				
			}
			
		] );
		
	};
	
	this.asyncDialExistsForSync = function( globalId, callback ){
		
		var query = {
			query: "select exists(select * from `dials` where `global_id` = :global_id) as dial_exists",
			params: {global_id: globalId}
		};
		
		this.asyncCustomQuery( query, ["dial_exists"], function( result ){
			
			var exists = false;
			
			try{
				exists = result[0].dial_exists == 1;
			}
			catch( ex ){
				
			}
			
			callback( exists );
			
		} );
		
	};
	
	this.asyncMassUpdate = function( globalIds, data, callback ){
		
		var set = [];
		for( var k in data ){
			set.push( "`"+k+"`=:"+k );
		}
		
		var query = {
			query: "UPDATE `dials` SET " + set.join(",") + " WHERE `global_id` IN ('"+globalIds.join("','")+"')",
			params: data
		};
		
		this.asyncCustomQuery( query, [], callback );
		
	};
	
	this.asyncListDialsForSync = function( where, callback, ignoreNoSync, forceGetPreview ){
		
		var fieldsToSelect = _getDialsFieldsToSelect();
		fieldsToSelect.push( "global_id" );
		fieldsToSelect.push( "thumb_url" );
		fieldsToSelect.push( "delay" );		
		fieldsToSelect.push( "update_interval" );			
		fieldsToSelect.push( "manually_cropped" );				
		fieldsToSelect.push( "need_sync_screen" );	
		var fieldsInQuery = [];
		
		fieldsToSelect.forEach(function( value ){
			fieldsInQuery.push( "`dials`."+value );
		});
		
		where = where || "1=1";
		
		if( where ){
			where = " WHERE " + where;
			
			if( !ignoreNoSync ){
				where += " AND `dials_groups`.`sync` = 1";
			}
		}
		
		fieldsToSelect.push( "group_global_id" );
			
		self.asyncCustomQuery( "SELECT " + fieldsInQuery.join(",") + ", `dials_groups`.`global_id` as `group_global_id` FROM `dials`  JOIN `dials_groups` ON `dials`.`group_id` = `dials_groups`.`rowid` " + where, fieldsToSelect, function( list ){
						
			// need check if preview is local file, get it contents
			var outList = [];
			
			//var i = 0;
			
			fvd_speed_dial_Async.arrayProcess( list, function( dial, arrayProcessCallback ){

				//i++;
				
				var manually_cropped = dial.manually_cropped;				
				
				//dump( i + "/" + list.length + "\n" );
				
				if( dial.thumb_source_type == "local_file" ){
					
					//dump( "Local...\n" );
					
					if( dial.need_sync_screen || forceGetPreview ){
						self.asyncDialPreviewBase64Contents( dial.rowid, function( base64File ){
							
							if( base64File != null ){
								dial._previewContent = base64File;	
								outList.push( dial );					
							}
							
							if( manually_cropped ){
								dial.thumb_source_type = "url";
								dial.local_file_type = "manual_crop";
							}
							
							//dump( "End...\n" );
							
							arrayProcessCallback();
							
						} );
					}
					else{
						arrayProcessCallback();
					}

				}
				else{
					outList.push( dial );
					
					//dump( "Url...\n" );
					
					arrayProcessCallback();
				}
				
				delete dial.need_sync_screen;
				delete dial.manually_cropped;
				
				
			}, function(){
				
				//dump( "END!\n" );
				
				callback( outList );
			} );
						
		} );
		
	};
	
	this.asyncListGroupsForSync = function( where, callback, ignoreNoSync ){
		
		var fields = ["global_id", "name", "position", "rowid"];
		
		where = where || "1=1";
		
		if( where ){
			where = " WHERE " + where ;
			
			if( !ignoreNoSync ){
				where += " AND `sync` = 1";
			}			
		}
		
		var query = "SELECT " + fields.join(",") + " FROM `dials_groups`" + where;
		
		self.asyncCustomQuery( query, fields, callback );
		
	};
	
	this.asyncCustomQuery = function( queryData, fieldsToSelect, callback ){
		
		var data = [];
		var params = {};
		
		if( typeof queryData == "object" ){
			query = queryData.query;
			params = queryData.params;
		}
		else{
			query = queryData;
		}		
		
		try{
			var statement = this.connection.createStatement( query );			
		}
		catch( ex ){
			dump( "Failure with statement. " + ex + "("+query+")\n" );	
			return;
		}
		
		//dump( "Start async query " + query + "("+statement+")\n" );
		
		if( params ){
			
			for( var key in params ){
				try{
					statement.params[key] = params[key];					
				}
				catch( ex ){
					dump( ex + ": " + key + " = " + params[key] + "( "+query+" )\n" );
					return false;
				}								
			}
			
		}
		
		statement.executeAsync({  
			handleResult: function(aResultSet) { 
				if( fieldsToSelect ){
					for (var row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {	
						var d = {};
						fieldsToSelect.forEach(function( fieldName ){
							var value = row.getResultByName( fieldName );  
							d[fieldName] = value;
						});		
						data.push( d );
					}  
				} 
			},  
			
			handleError: function(aError) {  
				dump( "ERROR Execute statement("+aError.message+")\n" );
			},  
			
			handleCompletion: function(aReason) {  	
				if( callback ){
					callback( data );								
				}
			}  
		}); 
		
	};
	
	
	/* transactions */
	this.beginTransaction = function(){
		this.connection.beginTransaction();
	};
	this.commitTransaction = function(){
		this.connection.commitTransaction();
	};
	this.rollbackTransaction = function(){
		this.connection.rollbackTransaction();
	};
	
	
	this.importFromJSON = function( table, rows, progressCallback, callback ){
		if( rows.length == 0 ){
			return callback();
		}
		
		var imported = 0;
		
		var availableColumns = this.tableColumnsNames( table );
		availableColumns.push( "rowid" );			
		
		fvd_speed_dial_Async.arrayProcess( rows, function( row, apCallback ){
			
			var fieldsList = [];
			var valuesList = [];
			
			for( var f in row ){
				var v = row[ f ];
				if( availableColumns.indexOf( f ) == -1 ){
					continue;
				}
				fieldsList.push( f );				
				valuesList.push( ":"+f );
			}
			
			var fields = "`" + fieldsList.join("`,`") + "`";
			var values = valuesList.join( "," );
			
			
			
			var params = {};
			for( var j = 0; j != fieldsList.length; j++ ){
				var f = fieldsList[j];
				params[ f ] = row[f];
			}
			
			self.asyncCustomQuery( {
				query: "INSERT INTO `"+table+"`("+fields+") VALUES("+values+")",
				params: params
			}, [], function(){
				
				imported++;
				
				dump( 'imported: ' + imported + "\n" );
				
				if( progressCallback ){
					progressCallback( imported, rows.length );
				}
				
				apCallback();

			} );
			
		}, function(){
			
			if( callback ){
				callback();
			}
			
		} );
		
	};
	
	this.tableColumnsNames = function( table ){
		var query = "PRAGMA TABLE_INFO("+table+")";
		
		var statement = this.connection.createStatement( query );
		var result = [];
		
		while( statement.executeStep() ){
			result.push( statement.row.name );
		}
		
		return result;
	};
	
	this.truncateTable = function( table, where ){		
		where = where || "";
		if( where ){
			where = "WHERE " + where;
		}
		
		if( table == "dials" ){
			
			var dials = this.listDials( true );
			dials.forEach( function( dial ){
				self.remove( dial.id, {
					removePreview: true
				} );
			} );
				
		}
		else{
			this.connection.executeSimpleSQL( "DELETE FROM `"+table+"` " + where );
		}
		
	};
	
	
	this.getAllTablesNames = function(){
		// get list of all tables
		var statement = this.connection.createStatement( "SELECT name FROM sqlite_master "+
		"WHERE type='table' " +
		"ORDER BY name; " );
		
		var result = [];
		
		while( statement.executeStep() ){
			result.push( statement.row.name );
		}		
		
		return result;
	};	
	
	this.dumpAll = function(){
		

		// objects that handles all tables data
		var data = {};
		
		var names = this.getAllTablesNames();
			
		for( var i = 0; i != names.length; i++ ){
			var tableName = names[i];
			var query = "SELECT *, rowid FROM `"+tableName+"`";
			
			data[tableName] = [];
										
			var statement = this.connection.createStatement( query );
			
			var fields = [];
			for( var j = 0; j != statement.columnCount; j++ ){
				fields.push( statement.getColumnName(j) );
			}
			
			while( statement.executeStep() ){
				var row = {};
				
				for( var t in fields ){
					var k = fields[t];					
					row[k] = statement.row[k];
				}
				data[tableName].push( row );
			}
			
		}
		
		return data;
		
	};
	
	/* Default dials */
	
	this.getDefaultDials = function(){
		if( this.defaultDialsCache === null ){
			this.readDefaultDials();
		}
		return this.defaultDialsCache;
	};
	
	this.readDefaultDials = function(){
		try{
			var contents = this._get_file_contents(DEFAULT_DIALS_FILE);

			var lines = contents.split( "\n" );
			this.defaultDialsCache = [];
			var tmp = {};
			for( var i = 0; i != lines.length; i++ ){
				var data = lines[i].trim().split("|");
				if( data.length != 2 ){
					continue;
				}		
				
				if( typeof tmp[ data[0] ] == "undefined" ){
					tmp[ data[0] ] = [];
				}
					
				tmp[ data[0] ].push( data[1] );				
			}			
			
			for( var title in tmp ){
				var uri = tmp[title].join( "|" );
				this.defaultDialsCache.push( {
					"uri": uri,
					"title": title
				} );
			}
		}
		catch( ex ){
			//dump( "ERROR read default dials: " + ex + "\r\n" );
		}
	};
	
	/* Modified most visited */
	
	this.setMostVisitedModifiedUrlDataIfExists = function( url, params ){
		var p = [];
		for( var param in params ){
			p.push( "`"+param+"` = :" + param );			
		}
		
		
		var statement = this.connection.createStatement( "UPDATE `most_visited_modified_urls` SET "+p.join(",")+" WHERE url = :url" );

		for( var param in params ){
			statement.params[param]	= params[param];
		}
		
		statement.params.url = url;

		statement.execute();
	};
	
	this.setMostVisitedModifiedUrlData = function( url, params ){
		var statement = this.connection.createStatement( "INSERT OR IGNORE INTO `most_visited_modified_urls`(`url`) VALUES(:url)" );
		statement.params.url = url;
		statement.execute();
		
		//thumb_url, thumb_source_type, title, hand_changed		

		this.setMostVisitedModifiedUrlDataIfExists( url, params );
	},
	
	this.getMostVisitedData = function( url ){
		var grabData = {
			thumb_url: url,
			thumb_source_type: "url",
			title: null,
			delay: null,
			use_js: 1,
			hand_changed: false,
			disable_plugins: fvd_speed_dial_gFVDSSDSettings.getBoolVal( "sd.disable_plugins" ) ? 1 : 0,
			have_preview: 0
		};	
		var modifyUrlData = this.getMostVisitedModifiedUrlData( url );
		if( modifyUrlData ){
			grabData = modifyUrlData;
		}
		
		return grabData;
	};
	
	this.getMostVisitedModifiedUrlDataAll = function(){
		var statement = this.connection.createStatement( "SELECT `thumb_url`, `thumb_source_type`, `url`, `title`, `hand_changed`, `use_js`, `delay`, `disable_plugins`, `have_preview`, `status`, `thumb_width`, `thumb_height` FROM `most_visited_modified_urls`" );
		var result = [];
		while( statement.executeStep() ){
			result.push({
				thumb_url: statement.thumb_url,
				thumb_source_type: statement.row.thumb_source_type,
				url: statement.row.url,
				title: statement.row.title,
				hand_changed: statement.row.hand_changed,
				use_js: statement.row.use_js,
				delay: statement.row.delay,
				disable_plugins: statement.row.disable_plugins,
				have_preview: statement.row.have_preview,
				status: statement.row.status,
				thumb_width: statement.row.thumb_width,
				thumb_height: statement.row.thumb_height
			}
			);
		}
		return result;
	};
	
	this.getMostVisitedModifiedUrlData = function( url ){
		var statement = this.connection.createStatement( "SELECT `thumb_url`, `thumb_source_type`, `title`, `hand_changed`, `use_js`, `delay`, `disable_plugins`, `have_preview`, `status`, `thumb_width`, `thumb_height` FROM `most_visited_modified_urls` WHERE `url` = :url" );
		statement.params.url = url;
		if( statement.executeStep() ){
			return {
				thumb_url: statement.row.thumb_url,
				thumb_source_type: statement.row.thumb_source_type,
				title: statement.row.title,
				hand_changed: statement.row.hand_changed,
				use_js: statement.row.use_js,
				delay: statement.row.delay,
				disable_plugins: statement.row.disable_plugins,
				have_preview: statement.row.have_preview,
				status: statement.row.status,
				thumb_width: statement.row.thumb_width,
				thumb_height: statement.row.thumb_height				
			};
		}
		return null;
	};
	
	this.mostVisitedModifiedUrlDataExists = function( url ){
		var statement = this.connection.createStatement( "SELECT `rowid` FROM `most_visited_modified_urls` WHERE `url` = :url" );
		statement.params.url = url;
		if(statement.executeStep()){
			return true;
		}
		return false;
	};
	
	this.clearMostVisitedModifiedUrlData = function(){
		var statement = this.connection.createStatement( "DELETE FROM `most_visited_modified_urls`" );
		statement.execute();
	};
	
	
	/* Removed most visited */
	
	this.invalidateRemovedMostVisitedCache = function(){
		this.mostVisitedRemovedCache = null;
	};
	
	this.getRemovedMostVisited = function(){
		if( this.mostVisitedRemovedCache == null ){
			this.refreshMostVisitedRemovedCache();
		}
		return this.mostVisitedRemovedCache;
	};
	
	this.refreshMostVisitedRemovedCache = function(){
		this.mostVisitedRemovedCache = [];
		var statement = this.connection.createStatement( "SELECT `uri` FROM `most_visited_removed_uris`" );
		while( statement.executeStep() ){
			this.mostVisitedRemovedCache.push( statement.row.uri );
		}
	};
	
	this.removeMostVisited = function( uri ){
		uri = uri.toLowerCase();
		var statement = this.connection.createStatement( "INSERT INTO `most_visited_removed_uris` (`uri`) VALUES(:uri)" );
		statement.params.uri = uri;
		statement.execute();	
		
		this.invalidateRemovedMostVisitedCache();
		this.invalidateMostVisitedCache();	
	};
	
	this.clearRemovedMostVisited = function(){
		this.connection.executeSimpleSQL( "DELETE FROM `most_visited_removed_uris`" );
		
		this.invalidateRemovedMostVisitedCache();
		this.invalidateMostVisitedCache();	

		this.notifyObservers( "FVD.Toolbar-SD-MostVisited-Removed-Cleared" );
	};
	
	/* Most visited */
	
	this.mostVisitedCacheLifeTime = function(){
		if( this._mostVisitedCacheLifeTime === null ){
			this._mostVisitedCacheLifeTime = this.registry.getCharPref( "sd.most_visited_cache_life_time" );
		}
		
		return this._mostVisitedCacheLifeTime;
	};
	
	this._mostVisitedCacheExpired = function( time ){
		var now = (new Date()).getTime();
		if( now - time >= this.mostVisitedCacheLifeTime() ){
			return true;
		}
		
		return false;
	};
	
	this.invalidateMostVisitedCache = function(){
		for( var k in this.mostVisitedCache ){
			this.mostVisitedCache[k].update_time = 0;			
		}
		this._mostVisitedCacheLifeTime = null;
	};
	

	
	this.getMostVisited = function( interval, type, count, order ){		
		var cacheKey = this.mostVisitedCacheKey( interval, order );
	
		if( !this.mostVisitedCache[cacheKey] || this._mostVisitedCacheExpired( this.mostVisitedCache[cacheKey].update_time ) ){
			
			this.refreshMostVisitedCache( interval, order );
		}
		
		return this.mostVisitedCache[cacheKey][type].slice( 0, count );		
	};
	
	this.getMostVisitedByDomain = function( interval, domain, order ){
		var cacheKey = this.mostVisitedCacheKey( interval, order );
		
		if( !this.mostVisitedCache[cacheKey] || this._mostVisitedCacheExpired( this.mostVisitedCache[cacheKey].update_time ) ){
			
			this.refreshMostVisitedCache( interval, order );
		}
		if( !this.mostVisitedCacheGrouppedByDomain[cacheKey] ){
			return null;
		}
		if( !this.mostVisitedCacheGrouppedByDomain[cacheKey][domain] ){
			return null;
		}
		
		return this.mostVisitedCacheGrouppedByDomain[cacheKey][domain];
	};
	
	this.mostVisitedCacheKey = function( interval, order ){
		return interval+"_"+order;
	};
	
	/*
	 *  to fast access most visited database we use cache
	 */
	this.refreshMostVisitedCache = function( interval, order ){
		order = order || "visits";
		
		// clear our history tables
		try{
			//this.connection.executeSimpleSQL( 'DELETE FROM "most_visited_uri_'+interval+'"' );	
			//this.connection.executeSimpleSQL( 'DELETE FROM "most_visited_domain_'+interval+'"' );	
			
			// perform places query
			
			var defaultFavicon = Components.classes['@mozilla.org/browser/favicon-service;1'].getService(Components.interfaces.nsIFaviconService).defaultFavicon.spec;
			
			var historyService = Components.classes["@mozilla.org/browser/nav-history-service;1"]
		                               	   .getService(Components.interfaces.nsINavHistoryService);
											   
			var options = historyService.getNewQueryOptions();
						
			var defaultFavicon = Components.classes['@mozilla.org/browser/favicon-service;1'].getService(Components.interfaces.nsIFaviconService).defaultFavicon.spec;
			
			var query = historyService.getNewQuery();
						
			if( order == "visits" ){
				options.sortingMode = options.SORT_BY_VISITCOUNT_DESCENDING;				
			}
			else if( order == "date" ){
				options.sortingMode = options.SORT_BY_DATE_DESCENDING;								
			}

			var cacheKey = this.mostVisitedCacheKey( interval, order );
			
			options.maxResults = MAX_URIS_IN_HISTORY_QUERY;
			
			if( interval != "all_time" ){		
			  
  			query.beginTimeReference = query.TIME_RELATIVE_EPOCH;
  			query.endTimeReference = query.TIME_RELATIVE_EPOCH;
  											
  			var microDay = 24 * 3600 * 1000 * 1000;
  			
  			query.endTime = (new Date()).getTime() * 1000;		
  			
  			if( interval == "week" ){
  				query.beginTime = query.endTime - 7 * microDay;
  			}
  			else if( interval == "month" ){
  				query.beginTime = query.endTime - 30 * microDay;			
  			}

			}
			
			var result = [];
			
			var qr = historyService.executeQuery(query, options);
			
			var cont = qr.root;
			
			var domains = [];
			
			this.mostVisitedCache[cacheKey] = {};
			this.mostVisitedCache[cacheKey].domain = [];
			this.mostVisitedCache[cacheKey].uri = [];
			this.mostVisitedCacheGrouppedByDomain[cacheKey] = {};
			
			cont.containerOpen = true;
			
			var removedMostVisited = this.getRemovedMostVisited();
			
			for (var i = 0; i < cont.childCount; i ++) {			
			    var node = cont.getChild(i);				
	
				if( !node.uri || !node.title ){
					continue;
				}
				
				var lowerUri = node.uri.toLowerCase();
				
				if( removedMostVisited.indexOf( lowerUri ) != -1 ){
					continue;
				}
				
				if( lowerUri.indexOf( "http" ) != 0 ){
					continue;
				}
				
				if( this.isDenyUrl( node.uri ) ){
					continue;
				}
				
				var uri = node.uri;
				var favicon = node.icon ? node.icon : defaultFavicon; 
				var title = node.title
				var domain = this._getDomain( lowerUri );
				var visits = node.accessCount;
				
				var data = {
					"url": uri,
					"domain": domain,
					"title": title,
					"favicon": favicon,
					"visits": visits,
					"total_visits": visits,
					"in_group": 1
				};
				
				if( !this.mostVisitedCacheGrouppedByDomain[cacheKey][domain] ){
					this.mostVisitedCacheGrouppedByDomain[cacheKey][domain] = [];
				}
				this.mostVisitedCacheGrouppedByDomain[cacheKey][domain].push( data );
				
				// add to domains
				var index;
				if( (index = domains.indexOf(domain)) == -1 ){					
					domains.push( domain );
					/*
					var statement = this.connection.createStatement( "INSERT INTO `most_visited_domain_"+interval+"`(`title`, `favicon`, `domain`, `url`, `visits`) VALUES(:title, :favicon, :domain, :url, :visits)" );
					statement.params.title = title;
					statement.params.favicon = favicon;
					statement.params.domain = domain;
					statement.params.url = uri;
					statement.params.visits = visits;
					
					statement.execute();
					*/
					this.mostVisitedCache[cacheKey].domain.push(data);
				}
				else{
					this.mostVisitedCache[cacheKey].domain[index].total_visits += data.visits;
					this.mostVisitedCache[cacheKey].domain[index].in_group++;
				}
				
				this.mostVisitedCache[cacheKey].uri.push(data);
				/*
				var statement = this.connection.createStatement( "INSERT INTO `most_visited_uri_"+interval+"`(`title`, `favicon`, `url`, `visits`) VALUES(:title, :favicon, :url, :visits)" );
				statement.params.title = title;
				statement.params.favicon = favicon;
				statement.params.url = uri;
				statement.params.visits = visits;				
				statement.execute();
				*/			
										
			}
			
			var now = (new Date()).getTime();
			
			this.mostVisitedCache[cacheKey].update_time = now;
			
			cont.containerOpen = false;
		}
		catch( ex ){
			//dump( "ERROR REFRESH HISTORY " + ex + "\r\n" );
		}
		

	};
	
	
	this.notifyObservers = function( message, aData ){
		
        this.observer.notifyObservers(null, message, aData);
	};
	
	this._init = function(){		

		try{
			this.registry = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getBranch(SETTINGS_KEY_BRANCH);
	
	        this.observer = Components.classes['@mozilla.org/observer-service;1'].getService(Components.interfaces.nsIObserverService);
	
	        var file = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties).get('ProfD', Components.interfaces.nsIFile);
	        file.append(STORAGE_FOLDER);
	        		
	
	        if (!file.exists()) 
	            file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);
	        if (file.exists() && file.isDirectory()) {
	            file.append(DB_FILE);
	            
				if( !file.exists() ){
	
				}			
	        }
			
			var storageService = Components.classes["@mozilla.org/storage/service;1"]
					                       .getService(Components.interfaces.mozIStorageService);
			this.connection = storageService.openDatabase(file);		
			
			try{
				this._createTables();			
			}
			catch( ex ){
				//dump( "ERROR WHILE CREATE TABLES  " + ex.message + "("+this.connection.lastErrorString+")" );
			}			
		}
		catch( ex ){
			//dump( "Error init sd storage: " + ex + "\r\n" );
		}

			
	};
	
	this._prepareDenySign = function( sign, type ){
		sign = sign.toLowerCase();
		
		if( type == "domain" ){
			// extract domain from url
			try{
				var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
	        	var uri = ioService.newURI(sign, null, null);				
				sign = uri.host;
				
			}
			catch( ex ){
				sign = sign;
			}

			sign = sign.replace( "www.", "" );
		}
		else if(type == "url"){
			// remove http from sign
			sign = sign.replace("http://", "");
			// remove www from sign
			sign = sign.replace( "www.", "" );
			// remove and "/"
			if( sign.charAt( sign.length - 1 ) == "/" ){
				sign = sign.substring( 0, sign.length - 1 );
			}
		}
		
		return sign;
	};
	
	this.refreshDenyCache = function(){
		this.denyCache = this.denyList();
	};
	
	this.isDenyUrl = function( url, denyDetails ){
	  denyDetails = denyDetails || {};
	  
		if( this.denyCache == null ){
			this.refreshDenyCache();
		}
		
		var url = this._prepareDenySign( url, "url" );
		for( var i = 0; i != this.denyCache.length; i++ ){			
			var deny = this.denyCache[i];
			
			if( deny.type == "domain" ){
				if( url.indexOf( deny.effective_sign ) != -1 ){
				  denyDetails.deny = deny;
					return true;
				}
			}
			else if( deny.type == "url" ){
				if( url == deny.effective_sign ){
				  denyDetails.deny = deny;
					return true;
				}
			}
		}
		
		return false;		
	};

	
	this.refreshDialsDeny = function(){
		this._flushCache();
		
		try{		
			var dials = this.listDials( true );
			var deny = this.denyList();
			
			for( var i = 0; i != dials.length; i++ ){				
				var dial = dials[i];
				var newDeny = 0;
				
				if( this.isDenyUrl( dial.url ) ){
					newDeny = 1;
				}
				
				//dump( "Check dial: " + dial.url + "("+newDeny+")\r\n" );
								
				if( newDeny != dial.deny ){
					this.updateDialData( dial.id, {
						deny: newDeny
					} );
				}
			}
		}
		catch( ex ){
			//dump( "ERROR " + ex + "\r\n" );
		}
		
	};
	
	this.denyExists = function( sign, type ){
		var effective_sign = this._prepareDenySign( sign, type );
		
		var statement = this.connection.createStatement( "SELECT `rowid` FROM `deny` WHERE `effective_sign` = :effective_sign AND `type` = :type" );
		statement.params.effective_sign = effective_sign;
		statement.params.type = type;
		
		if( statement.executeStep() ){
			return true;
		}
		
		return false;
	},
	
	this.denyUrl = function( sign, type ){
		var effective_sign = this._prepareDenySign( sign, type );
		
		var statement = this.connection.createStatement( "INSERT INTO `deny` (`sign`, `type`, `effective_sign`) VALUES(:sign, :type, :effective_sign)" );
		statement.params.sign = sign;
		statement.params.type = type;
		statement.params.effective_sign = effective_sign;
		statement.execute();	
		
		this.refreshDenyCache();
		this.refreshDialsDeny();
		this.invalidateMostVisitedCache();
		
		this.notifyObservers( "FVD.Toolbar-SD-Deny-Updated" );
	};
	
	this.getDenyById = function( id ){
		try{
			var statement = this.connection.createStatement( "SELECT `sign`, `type`, `effective_sign` FROM `deny` WHERE rowid = :id" );
			statement.params.id = id;
			if( statement.executeStep() ){								
				return({
					sign: statement.row.sign,
					type: statement.row.type,
					effective_sign: statement.row.effective_sign
				});
			}
		}
		catch( ex ){
			return false;
		}
	};
	
	this.updateDeny = function( id, data ){
		try{
			data.effective_sign = this._prepareDenySign( data.sign, data.type );
			
			var statement = this.connection.createStatement( "UPDATE `deny` SET `sign` = :sign, `type` = :type, `effective_sign` = :effective_sign WHERE rowid = :id" );
			statement.params.id = id;
			statement.params.sign = data.sign;
			statement.params.type = data.type;
			statement.params.effective_sign = data.effective_sign;
			
			statement.execute();
			
			this.refreshDenyCache();
			this.refreshDialsDeny();
			this.invalidateMostVisitedCache();
			
			this.notifyObservers( "FVD.Toolbar-SD-Deny-Updated" );
		}
		catch( ex ){
			return false;
		}
	};
	
	this.removeDeny = function( denyId ){
		var statement = this.connection.createStatement( "DELETE FROM `deny` WHERE `rowid` = :id" );
		statement.params.id = denyId;
		statement.execute();
		
		this.refreshDenyCache();
		this.refreshDialsDeny();
		this.invalidateMostVisitedCache();
		
		this.notifyObservers( "FVD.Toolbar-SD-Deny-Updated" );
	};
	
	this.denyList = function(){	
		try{
			var data = [];
			var statement = this.connection.createStatement( "SELECT rowid, `sign`, `type`, `effective_sign` FROM `deny`" );		
			while( statement.executeStep() ){								
				data.push({
					sign: statement.row.sign,
					type: statement.row.type,
					id: statement.row.rowid,
					effective_sign: statement.row.effective_sign
				});
			}					
		}
		catch( ex ){
			//dump( "DENY LIST ERROR" + ex + "\r\n" );
		}
			
		return data;		
	};
	
	/* Groups functions */
	
	this.returnAnotherGroupIfNotExists = function( id ){
		try{
			var statement = this.connection.createStatement( "SELECT `rowid` FROM `dials_groups` WHERE `rowid` = :id" );
			statement.params.id = id;
			if( statement.executeStep() ){
				return null;
			}
			// get another
			statement = this.connection.createStatement( "SELECT `rowid` FROM `dials_groups` LIMIT 1" );
			if( statement.executeStep() ){
				return statement.row.rowid;
			}
		}
		catch( ex ){
			
		}
		
		return null;
	};
	
	this.groupGlobalId = function( groupId ){
		
		try{
			var statement = this.connection.createStatement( "SELECT `global_id` FROM `dials_groups` WHERE `rowid` = :id" );
			statement.params.id = groupId;
			if( statement.executeStep() ){
				return statement.row.global_id;
			}
		}
		catch( ex ){
			
		}
		
		return null;
		
	};
	
	this.groupIdByGlobalId = function( groupGlobalId ){
		
		try{
			var statement = this.connection.createStatement( "SELECT `rowid` FROM `dials_groups` WHERE `global_id` = :id" );
			statement.params.id = groupGlobalId;
			if( statement.executeStep() ){
				return statement.row.rowid;
			}
		}
		catch( ex ){
			
		}
		
		return null;
		
	};
	
	
	this.groupsCount = function(){
		var count = 0;
		try{
			var statement = this.connection.createStatement( "SELECT COUNT(*) cnt FROM `dials_groups`" );	
			if( statement.executeStep() ){
				return statement.row.cnt;
			}
		}
		catch( ex ){
			
		}
		
		return count;
	};
	
	this.groupNextPosition = function(){
		var position = 0;
		try{
			var statement = this.connection.createStatement( "SELECT MAX(`position`) pos FROM `dials_groups`" );
			if( statement.executeStep() ){
				position = statement.row.pos;
			}
		}
		catch( ex ){
			
		}
		
		return position + 1;
	};
	
	this.asyncGroupNextPosition = function( callback ){

		try{
			var query = "SELECT MAX(`position`) pos FROM `dials_groups`";
			this.asyncCustomQuery( query, ["pos"], function( data ){
				var pos = 0;
				try{
					pos = data[0].pos;	
				}
				catch(ex){
					
				}				
				
				callback( pos + 1 );
			} );
		}
		catch( ex ){
			callback( 1 );
		}
		
	};
	
	this.changePos = function( groupId, type ){
		this._flushCache();
		
		var group = this.getGroupById( groupId );
		
		var changedGroups = [];
		
		try{
			var statement;
			if( type == "top" ){
				statement = this.connection.createStatement( "SELECT `dials_groups`.`rowid`, t.pos FROM `dials_groups`, (SELECT MAX(`position`) pos FROM `dials_groups` WHERE `position` < :position) t where t.pos = `dials_groups`.position" )				
			}
			else if( type == "bottom" ){
				statement = this.connection.createStatement( "SELECT `dials_groups`.`rowid`, t.pos FROM `dials_groups`, (SELECT MIN(`position`) pos FROM `dials_groups` WHERE `position` > :position) t where t.pos = `dials_groups`.position" );								
			}

			statement.params.position = group.position;
			if( statement.executeStep() && statement.row.pos ){
				this.connection.executeSimpleSQL( "UPDATE `dials_groups` SET `position` = " + statement.row.pos + " WHERE rowid = " + groupId );
				this.connection.executeSimpleSQL( "UPDATE `dials_groups` SET `position` = " + group.position + " WHERE rowid = " + statement.row.rowid );
			}
			
			this.notifyObservers( "FVD.Toolbar-SD-Group-Updated" );
			
			changedGroups.push(groupId);
			changedGroups.push(statement.row.rowid);			
		}
		catch( ex ){
			//dump( "ERRO " + ex + " , " + this.connection.lastErrorString + "\r\n" );
		}
		
		return changedGroups;
	};


	
	this.addGroup = function( name ){
		this._flushCache();
		
		var data = {};
		if( typeof name == "string" ){
			data = {
				name: name,
				sync: 1
			};
		}
		else{
			data = name;
		}
		
		try{
			var statement = this.connection.createStatement( "INSERT INTO `dials_groups`(`name`, `position`, `global_id`, `sync`) VALUES(:name, :position, :global_id, :sync)" );
			statement.params.name = data.name;
			statement.params.position = this.groupNextPosition();
			statement.params.global_id = data.global_id || this.generateGUID();
			statement.params.sync = data.sync;
			statement.execute();
			
			this.notifyObservers( "FVD.Toolbar-SD-Group-Added", this.connection.lastInsertRowID );
			
			return this.connection.lastInsertRowID;			
		}
		catch( ex ){
			
		}
		
		return null;
	};
	
	this.groupIdByName = function( name ){
		try{
			var statement = this.connection.createStatement( "SELECT rowid FROM `dials_groups` WHERE `name` = :name" );
			statement.params.name = name;
			if( statement.executeStep() ){
				return statement.row.rowid;
			}
		}
		catch( ex ){
			
		}
		
		return false;
	};
	
	this.groupExists = function( name ){
		
		try{
			var statement = this.connection.createStatement( "SELECT rowid FROM `dials_groups` WHERE `name` = :name" );
			statement.params.name = name;
			if( statement.executeStep() ){
				return true;
			}
		}
		catch( ex ){
			
		}
		
		return false;
		
	};
	
	this.groupExistsById = function( id ){
		
		try{
			var statement = this.connection.createStatement( "SELECT rowid FROM `dials_groups` WHERE `rowid` = :rowid" );
			statement.params.rowid = id;
			if( statement.executeStep() ){
				return true;
			}
		}
		catch( ex ){
			
		}
		
		return false;
		
	};
	
	this.updateGroupData = function( id, data ){
		this._flushCache();
		
		if( typeof data == "string" ){
			data = {
				name: data
			};
		}
		
		try{
			
			var syncStateChanged = false;
			
			if( typeof data.sync != "undefined" ){
				var oldData = this.getGroupById( id );
				if( oldData.sync != data.sync ){
					syncStateChanged = true;
				}
			}
			
			var sql = "UPDATE `dials_groups` SET ";
			var set = [];
			for( var key in data ){
				set.push( "`"+key+"` = :"+key );
			}
			sql += set.join( "," );
			
			sql += " WHERE rowid = :groupId";
			
			var statement = this.connection.createStatement( sql );
			for( var key in data ){
				statement.params[key] = data[key];
			}
			statement.params.groupId = id;
			
			statement.execute();
		
			this.notifyObservers( "FVD.Toolbar-SD-Group-Updated" );
			
			if( syncStateChanged ){				
				this.notifyObservers( "FVD.Toolbar-SD-Group-Sync-State-Changed", id );				
			}
			
		}
		catch(ex){
			
			dump( "Exception while edit group: " + ex );
			
		}
	};
	
	this.canRemoveGroups = function(){
		return this.groupsCount() > 1;
	};
	
	this.removeGroup = function( id ){
		try{
			var statement = this.connection.createStatement( "DELETE FROM `dials_groups` WHERE `rowid` = :id" );
			statement.params.id = id;
			statement.execute();
			
			this.notifyObservers( "FVD.Toolbar-SD-Group-Removed" );
		}
		catch( ex ){
			
		}
	};
	
	this.getGroupById = function( id ){
		try{
			var statement = this.connection.createStatement( "SELECT `name`, `position`, `sync`, `global_id` FROM `dials_groups` WHERE `rowid` = :id" );
			statement.params.id = id;
			
			if( statement.executeStep() ){
				return {
					"id": id,
					position: statement.row.position,
					name: statement.row.name,
					sync: statement.row.sync,
					global_id: statement.row.global_id
				};
			}
		}
		catch( ex ){
			
		}
		return null;
	};
	
	this.getGroupsList = function(){
		try{
			var result = [];
			var statement = this.connection.createStatement( "SELECT `rowid`, `name`, `sync`, `global_id` FROM `dials_groups` ORDER BY `position`, `rowid`" );
			while( statement.executeStep() ){
				result.push({
					"id": statement.row.rowid,
					"name": statement.row.name,
					sync: statement.row.sync,
					global_id: statement.row.global_id
				});
			}
			return result;
		}
		catch( ex ){
			
		}
		
		return null;
	};
	
	this.canSyncGroup = function( globalId, callback ){
		
		// always can
		
		
		
		if( callback ){
			

			var query = {
				query: "SELECT `sync` FROM `dials_groups` WHERE `global_id` = :global_id",
				params: { global_id: globalId }
			};		
			
			self.asyncCustomQuery( query, ["sync"], function( result ){
				
				if( result.length == 1 ){
					
					callback( result[0].sync == 1 );
					
				}
				else{
					callback( true );
				}
				
			});

			
		}
		else{
			var statement = this.connection.createStatement( "SELECT `sync` FROM `dials_groups` WHERE `global_id` = :global_id" );
			statement.params.global_id = globalId;
			
			var can = false;
			if( statement.executeStep() ){
				
				if( statement.row.sync == 1 ){
					can = true;
				}
					
			}
			return can;
		}
	
	};
	
	/* Dials functions */
	
	this.canSyncDial = function( globalId, callback ){
		
		//always can
		
		if( callback ){
			
			var query = {
				query: "SELECT `dials_groups`.`sync` FROM `dials_groups` WHERE `rowid` = (SELECT `group_id` FROM `dials` WHERE `global_id` = :global_id)",
				params: { global_id: globalId }
			};		
			
			self.asyncCustomQuery( query, ["sync"], function( result ){
				
				if( result.length == 1 ){
					
					callback( result[0].sync == 1 );
					
				}
				else{
					callback( true );
				}
				
			});
			
		}
		else{
			
			var statement = this.connection.createStatement( "SELECT `dials_groups`.`sync` FROM `dials_groups` WHERE `rowid` = (SELECT `group_id` FROM `dials` WHERE `global_id` = :global_id)" );
			statement.params.global_id = globalId;
			
			var can = false;
			if( statement.executeStep() ){
				
				if( statement.row.sync == 1 ){
					can = true;
				}
					
			}
			return can;
			
		}
		

	
	};
	
	this.getDirectory = function( directoryName ){
		var file = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties).get('ProfD', Components.interfaces.nsIFile);
	    file.append(STORAGE_FOLDER);
		
		if (!file.exists()) 
            file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, parseInt("0755", 8));			
			
		file.append(directoryName);
		
		if (!file.exists()) 
            file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, parseInt("0755", 8));		
		
		return  file;		
	};
	
	this.dialsPreviewDir = function(){		
		var file = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties).get('ProfD', Components.interfaces.nsIFile);
	    file.append(STORAGE_FOLDER);
		
		if (!file.exists()) 
            file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, parseInt("0755", 8));			
			
		file.append(SPEED_DIAL_SCREENSHOTS_DIRECTORY);
		
		return  file;		
	};
	
	this.dialPreviewFileById = function( dialId ){
		var file = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties).get('ProfD', Components.interfaces.nsIFile);
	    file.append(STORAGE_FOLDER);
		
		if (!file.exists()) 
            file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, parseInt("0755", 8));			
			
		file.append(SPEED_DIAL_SCREENSHOTS_DIRECTORY);
		
		if (!file.exists()) 
            file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, parseInt("0755", 8));
			
		file.append( dialId + ".png" );
		
		return file;
	};
	
	this.dialPreviewUrlById = function( dialId ){
		var file = this.dialPreviewFileById( dialId );
		
		//dump( "Dial preview path for " + dialId + " = " + file.path + "\n" );
		
		if( !file.exists() ){
			//dump( "Dial preview file not exists\n" );
			return false;
		}

		//dump( "Dial preview file exists, create url\n" );
		
		var ios = Components.classes["@mozilla.org/network/io-service;1"].
          					 getService(Components.interfaces.nsIIOService);
		var url = ios.newFileURI(file);
		
		var url = url.spec;
		
		//dump( "Thumb url is " + url + "\n" );
		
		return url;
	};
	
	this.asyncDialPreviewBase64Contents = function( dialId, callback ){

		var file = this.dialPreviewFileById( dialId );
		
		if( !file.exists() ){
		 	callback( null );
		}
		
		NetUtil.asyncFetch(file, function(inputStream, status) {  
			if (!Components.isSuccessCode(status)) {  
				callback( null );
			}  
			
			var stream = Components.classes["@mozilla.org/binaryinputstream;1"].createInstance(Components.interfaces.nsIBinaryInputStream);
			stream.setInputStream(inputStream);
			var encoded = btoa(stream.readBytes(stream.available()));
			
			callback( encoded );
		});  
		
	};
	
	this.removeSyncDataFile = function( name ){
		
		var file = this.getDirectory( SYNC_DATA_DIRECTORY );
		
		file.append( name );
		
		if( file.exists() ){
			try{
				file.remove( false );	
	
			}
			catch( ex ){
				dump( "Fail remove file " + ex +  "\n" );			
			}

		}
		
	};
	
	this.asyncPutDialPreviewImageInFile = function( dialId, imageUrl, extension, callback ){
		
		this._get_file_contents_async( imageUrl, function( content ){
			
			content = content || "";
			
			dump("CONTENT!: " + content + "\n");
			
			self.asyncPutDialPreviewInFile( dialId, content, extension, callback );
			
		} );
		
	};
	
	this.asyncPutDialPreviewBase64InFile = function( dialId, contents, extension, callback ){
			  
		var data = atob( contents );			  
					  
		this.asyncPutDialPreviewInFile( dialId, data, extension, callback );
		
	};
	
	this.asyncPutDialPreviewInFile = function( dialId, data, extension, callback ){
		
		extension = extension || "png";
		
		var file = this.getDirectory( SYNC_DATA_DIRECTORY );
		
		var fileName = fvd_speed_dial_Misc.md5( data ) + "." + extension;
		
		file.append( fileName );
		
		var ostream = FileUtils.openSafeFileOutputStream(file)  
		  
		var istream = Components.classes["@mozilla.org/io/string-input-stream;1"].createInstance(Components.interfaces.nsIStringInputStream);  
					  
		istream.setData(data, data.length);  	
		  
		// The last argument (the callback) is optional.  
		NetUtil.asyncCopy(istream, ostream, function(status) {  
			callback( file.path );
		});
		
	};
	
	this.clickDial = function( dialId ){ 
		try{
			var statement = this.connection.createStatement( "UPDATE `dials` SET `clicks` = `clicks` + 1 WHERE `rowid` = :id" );
			statement.params.id = dialId;
			statement.execute();	
			
			statement = this.connection.createStatement( "SELECT `clicks` FROM `dials` WHERE `rowid` = :id" );		
			statement.params.id = dialId;
			if(statement.executeStep()){
				return statement.row.clicks;
			}
			return 0;
		}
		catch(ex){
			
		}
	};
	
	this.getDialsThumbRefreshData = function(){
		
		var statement = this.connection.createStatement( "SELECT `rowid`, `update_interval`, `last_update_time` FROM `dials`" );
		var result = [];
		while( statement.executeStep() ){
			result.push({
				id: statement.row.rowid,
				update_interval: statement.row.update_interval,
				last_update_time: statement.row.last_update_time
			});
		}
		
		return result;
		
	};
	
	this.getDialsGlobalIdsByGroup = function( groupId ){
		
		var dialsIds = [];
		
		try{
			var statement = this.connection.createStatement( "SELECT `global_id` FROM `dials` WHERE `group_id` = :group_id" );
			statement.params.group_id = groupId;
			
			while(statement.executeStep()){
				dialsIds.push( statement.row.global_id );
			}	
		}
		catch( ex ){
			
			dump( "ERROR While getDialsGlobalIdsByGroup " + ex + "\n" );
				
		}
		
		return dialsIds;
		
	};
	
	this.listDials = function( all, groupId, limit, additionalFields ){

		additionalFields = additionalFields || [];
		
		var cacheKey = "list_dials." + JSON.stringify( arguments );
		var cacheResult = this._getFromCache( cacheKey ); 
		if( cacheResult ){
			return cacheResult;
		}
		
		var dials = [];
		
		var orderBy = "`position` ASC";
		var limitString = "";
		
		if( limit ){
			limitString = "LIMIT " + limit;
		}		
		
		
		var fieldsToSelect = _getDialsFieldsToSelect();
		
		additionalFields.forEach(function( field ){
			fieldsToSelect.push( field );
		});
		
		try{
			if( all ){
				var groupWhere = "";			
				if( groupId ){
					if( groupId == "all" ){
						orderBy = "clicks DESC";						
					}
					else{
						groupWhere = " WHERE `group_id` = " + groupId;						
					}
				}
				
				var  query = "SELECT "+fieldsToSelect.join(",")+" FROM `dials` "+groupWhere+" ORDER BY "+orderBy + " " + limitString;
				
				var statement = this.connection.createStatement( query ); 				
			}
			else{
				var groupWhere = "";
				var groupBy = "";
				
				if( groupId ){
					if (groupId == "all") {
						orderBy = "clicks DESC";
						groupBy = " GROUP BY `url` ";
					}
					else{
						groupWhere = " AND `group_id` = " + groupId;
					}
				}
				var query = "SELECT "+fieldsToSelect.join(",")+" FROM `dials` WHERE `deny` = 0 "+groupWhere+" " + groupBy + " ORDER BY " + orderBy + " " + limitString;

				var statement = this.connection.createStatement( query ); 
			}

			while( statement.executeStep() ){
				var dialData = {};
				fieldsToSelect.forEach(function( field ){
					var key = field;
					if( key == "rowid" ){
						key = "id";
					}
					dialData[key] = statement.row[ field ];
				});
												
				dials.push(dialData);
			}
			
						
		}
		catch( ex ){
			dump( "Fail get dials list: " + ex.message + "("+this.connection.lastErrorString+")\r\n");
		}
		
		this._setToCache( cacheKey, dials );
		
		return dials;
	};
	
	this.updateDialData = function( dialId, data ){
		
		this._flushCache();
		
		try{		
			
			var sql = "UPDATE `dials` SET `thumb_update_date` = datetime('now'), ";
			var set = [];
			for( var key in data ){
				if( typeof data[key] == 'undefined' ){
					continue;
				}				
				set.push( "`"+key+"` = :"+key );
			}
			sql += set.join( "," );
			
			sql += " WHERE rowid = :dialId";
			
			//dump( "Update sql " + sql + "\r\n" );
			
			var statement = this.connection.createStatement( sql );
			for( var key in data ){
				if( typeof data[key] == 'undefined' ){
					continue;
				}
				statement.params[key] = data[key];
			}
			statement.params.dialId = dialId;
			
			statement.execute();			
			
			this.notifyObservers( "FVD.Toolbar-SD-Dial-Updated" );			
		}
		catch( ex ){
			dump( "Fail update dial: " + ex + "("+this.connection.lastErrorString+")\r\n" );
		}		
		
	};
	
	this.moveDial = function( dialId, groupId ){
		this._flushCache();
		
		try{
			var newPosition = this.nextPosition( groupId );
			var statement = this.connection.createStatement( "UPDATE `dials` SET `group_id` = :group_id, `position` = :position WHERE `rowid` = :id" );
			statement.params.position = newPosition;
			statement.params.group_id = groupId;
			statement.params.id = dialId;
			
			statement.execute();
			
			this.notifyObservers('FVD.Toolbar-SD-Dial-Moved', dialId);
		}
		catch( ex ){
			//dump( "Fail move dial " + dialId + " to " + groupId + ": "+ex+"\r\n" );	
		}
	};

	this.asyncGetDialById = function( dialId, fields, callback ){
		
		fields = fields || this._dialFieldsToSelect;
		
		this.asyncCustomQuery( {
			query: "SELECT " + fields.join(",") + " FROM `dials` WHERE `rowid` = :id",
			params: {id: dialId}
		}, fields, function( list ){

			var result = null;
			
			try{
				if( list.length > 0 ){
					result = list[0];
				}				
			}
			catch( ex ){
				
			}

			
			callback( result );			
			
		} );
		
	};
	
	this.getDialById = function( dialId ){
		try{
			
			var statement = this.connection.createStatement( "SELECT rowid, url, title, `clicks`, thumb_src, thumb_update_date, position, thumb_source_type, "+
															 "thumb_url, group_id, use_js, hand_changed, delay, disable_plugins, status, `update_interval`, "+
															 "`restore_previous_thumb`, `ignore_restore_previous_thumb`, `manually_cropped` FROM `dials` WHERE rowid = :dial_id" ); 
			statement.params.dial_id = dialId;
			if( statement.executeStep() ){								
				return {
					id: statement.row.rowid,
					url: statement.row.url,
					title: statement.row.title,
					clicks: statement.row.clicks,
					thumb_src: statement.row.thumb_src,
					thumb_update_date: statement.row.thumb_update_date,
					position: statement.row.position,
					thumb_source_type: statement.row.thumb_source_type,
					thumb_url: statement.row.thumb_url,
					group_id: statement.row.group_id,
					use_js: statement.row.use_js,
					hand_changed: statement.row.hand_changed,
					delay: statement.row.delay,
					disable_plugins: statement.row.disable_plugins,
					status: statement.row.status,
					update_interval: statement.row.update_interval,
					restore_previous_thumb: statement.row.restore_previous_thumb,
					ignore_restore_previous_thumb: statement.row.ignore_restore_previous_thumb,
					manually_cropped: statement.row.manually_cropped
				};
			}
			
			
		}
		catch(ex){
			//dump( "Fail read dial " + ex + "\r\n" );
		}
		
		return false;
	};
	
	this.remove = function( dialId, params ){
		
		params = params || {};
		
		if( typeof params.notifyObservers == "undefined" ){
			params.notifyObservers = true;
		}
		
		if( params.removePreview ){
			
			try{
				var previewFile = this.dialPreviewFileById( dialId );
				previewFile.remove( false );
			}
			catch( ex ){
				
			}	
			
		}
		
		this._flushCache();
		
		try{
			var statement = this.connection.createStatement( "DELETE FROM `dials` WHERE rowid = :dial_id" ); 
			statement.params.dial_id = dialId;
			statement.execute();
			
			if( params.notifyObservers ){
				this.notifyObservers( "FVD.Toolbar-SD-Dial-Removed" );				
			}
		}
		catch( ex ){
			
		}
	};
	
	this.asyncRemoveDial = function(dialId, callback){
		this._flushCache();
		
		try{
			var previewFile = this.dialPreviewFileById( dialId );
			previewFile.remove( false );
		}
		catch( ex ){
			
		}		
		
		
		var query = {
			query: "DELETE FROM `dials` WHERE `rowid` = :rowid",
			params: { rowid: dialId }
		};
		
		this.asyncCustomQuery( query, null, callback );
	};	
	
	this.count = function( groupId, params ){
		var count = 0;
		
		params = params || {};
		
		var cacheKey = "dials_count_" + groupId + JSON.stringify(params);
		
		var cacheResult = this._getFromCache( cacheKey );
		
		if( cacheResult ){
			return cacheResult;
		}
		
		var clause = "*";
		if( params.uniqueUrl ){
			clause = "DISTINCT `url`";
		}
		
		try{
			var statement;
			
			if( groupId ){
				statement = this.connection.createStatement( "SELECT COUNT("+clause+") as cnt FROM `dials`  WHERE `deny` = 0 AND `group_id` = :group_id" );			
				statement.params.group_id = groupId;
			}
			else{
				var query = "SELECT COUNT("+clause+") as cnt FROM `dials`  WHERE `deny` = 0";
	
				statement = this.connection.createStatement( query );				
			}

			
			if( statement.executeStep() ){								
				count = statement.row.cnt;
			}			
		}
		catch( ex ){
			//dump( ex + ", " + this.connection.lastErrorString + "\r\n" );
		}
		
		this._setToCache( cacheKey, count );
		
		return count;
	};
	
	this.nextPosition = function( group_id ){
		var count = 0;
		try{
			var statement = this.connection.createStatement( "SELECT MAX(position) as cnt FROM `dials` WHERE `group_id` = :group_id" );
			statement.params.group_id = group_id;
			if( statement.executeStep() ){								
				count = statement.row.cnt;
			}
		}
		catch(ex){
			//dump( "Fail get dials count " + ex + "\r\n" );
		}
		return count+1;
	};
	
	this.asyncNextPosition = function( group_id, callback ){
		try{
			var query = {
				query: "SELECT MAX(`position`) pos FROM `dials` WHERE `group_id` = :group_id",
				params: {group_id: group_id}
			};
			
			this.asyncCustomQuery( query, ["pos"], function( data ){
				var pos = 0;
				try{
					pos = data[0].pos;	
				}
				catch(ex){
					
				}				
				
				callback( pos + 1 );
			} );
		}
		catch( ex ){
			callback( 1 );
		}		
	};
	
	this.urlExists = function( url ){
		// use prepareDenySign to prepare url to "default"
		url = this._prepareDenySign( url, "url" );
		try{
			var statement = this.connection.createStatement( "SELECT `url` FROM `dials`" );
			
			while( statement.executeStep() ){								
				var dialUrl = this._prepareDenySign( statement.row.url, "url" );
				
				//dump( "Compare " + dialUrl + " = " + url + "\r\n" );				
				
				if( url == dialUrl ){
					return true;
				}
			}
		}
		catch(ex){
			
		}
		
		return false;
	};
	
	this.urlExistsAsync = function( url, callback ){
		
		url = this._prepareDenySign( url, "url" );
		
		var that = this;
		
		var statement = this.connection.createStatement( "SELECT `url` FROM `dials`" );
		statement.executeAsync({
			handleResult: function(aResultSet) {  
				var found = false;
			
				for (var row = aResultSet.getNextRow();	row; row = aResultSet.getNextRow()) {  				
					var dialUrl = that._prepareDenySign( row.getResultByName("url"), "url" );
					
					if( url == dialUrl ){
						found = true;
						break;
					}
				} 
				
				callback( found );
			},  
			
			handleError: function(aError) {  
				callback( false ); 
			},  
			
			handleCompletion: function(aReason) {  

			} 
		});
		
	};


	this.insert = function( dialId, relDialId, insertType ){
		var relDial = this.getDialById( relDialId );
		var dial = this.getDialById( dialId );
		
		var newDialPosition = null;
		
		var sign = null;
		
		if( relDial.position > dial.position ){
			sign = "-";
		}
		else{
			sign = "+";
		}
		
		if( insertType == "after" ){
			if (sign == "-") {
				newDialPosition = relDial.position;
			}
			else{
				newDialPosition = relDial.position + 1;
				if( newDialPosition > this.nextPosition(dial.group_id) - 1 ){
					newDialPosition = relDial.position;
				}
			}

		}
		else if( insertType == "before" ){
			
			if( sign == "+" ){
				newDialPosition = relDial.position;
			}
			else{
				newDialPosition = relDial.position - 1;			
				if( newDialPosition < 1 ){
					newDialPosition = 1;
				}
			}
			
		}
		
		if( newDialPosition == dial.position ){
			// no position changes
			return false;
		}
		
		var dialsRangeStart = Math.min( newDialPosition, dial.position );
		var dialsRangeEnd = Math.max( newDialPosition, dial.position );


		//dump( newDialPosition + "<=>"  + dial.position + "\n" );
		
		// change dials pos
		
		var dialsWithChangedPositions = [parseInt(dialId)];
		
		var statement = this.connection.createStatement( "SELECT `rowid` as `id` FROM `dials` WHERE `group_id` = :group_id AND `position` >= :start AND `position` <= :end" );
		statement.params.group_id = dial.group_id;
		statement.params.start = dialsRangeStart;		
		statement.params.end = dialsRangeEnd;		
		while(statement.executeStep()){
			if( dialsWithChangedPositions.indexOf(statement.row.id) != -1 ){
				continue;
			}
			dialsWithChangedPositions.push( statement.row.id );
		}
		
		var statement = this.connection.createStatement( "UPDATE `dials` SET `position` = `position` " + sign + "1 WHERE `group_id` = :group_id AND `position` >= :start AND `position` <= :end" );
		statement.params.group_id = dial.group_id;
		statement.params.start = dialsRangeStart;		
		statement.params.end = dialsRangeEnd;		
		statement.execute();
		
		// change dial pos
		
		this.updateDialData( dialId, {
			position: newDialPosition
		} );
		
		//dump( "OLD POS = " + dial.position + ", new pos = " + newDialPosition + " ("+insertType+", reldial="+relDial.position+", max="+(this.nextPosition(dial.group_id) - 1)+")\n" );
		
		return dialsWithChangedPositions;
		
	};
	
	this.dialGlobalId = function( dialId ){
		
		try{
			var statement = this.connection.createStatement( "SELECT `global_id` FROM `dials` WHERE `rowid` = :id" );
			statement.params.id = dialId;
			if( statement.executeStep() ){
				return statement.row.global_id;
			}
		}
		catch( ex ){
			
		}
		
		return null;
		
	};
	
	this.asyncDialIdByGlobalId = function( globalId, callback ){
		var query = {
			query: "SELECT `rowid` FROM `dials` WHERE `global_id` = :global_id",
			params: { global_id: globalId }
		};
		
		this.asyncCustomQuery( query, ["rowid"], function( listData ){
			
			if( listData.length > 0 ){
				callback( listData[0].rowid );
			}
			else{
				callback( null );
			}
			
		} );		
	};
	

	this.add = function( url, title, thumb_source_type, thumb_url, 
	                     group_id, use_js, hand_changed, delay, disable_plugins, update_interval, need_sync_screen, global_id ){
		this._flushCache();
		
		thumb_source_type = thumb_source_type || "url";
		thumb_url = thumb_url || "";
		group_id = group_id || null;
		update_interval = update_interval || null;
		need_sync_screen = need_sync_screen || 0;
		global_id = global_id || this.generateGUID();
		
		
		try{
			var statement = this.connection.createStatement( 
				"INSERT INTO `dials`(`url`, `title`, `position`, `deny`, `thumb_source_type`, `thumb_url`, `group_id`, `clicks`," + 
				"`use_js`, hand_changed, delay, disable_plugins, update_interval, global_id, need_sync_screen) VALUES(:url, :title, :position, 0," + 
				":thumb_source_type, :thumb_url, :group_id, 0, :use_js, :hand_changed, :delay, :disable_plugins, :update_interval, :global_id, :need_sync_screen)" );
			statement.params.url = url;
			statement.params.title = title;
			statement.params.position = this.nextPosition(group_id);				
			statement.params.thumb_source_type = thumb_source_type;
			statement.params.thumb_url = thumb_url;
			statement.params.group_id = group_id;	
			statement.params.use_js = use_js;	
			statement.params.hand_changed = hand_changed;				
			statement.params.delay = delay;	
			statement.params.disable_plugins = disable_plugins;
			statement.params.update_interval = update_interval;	
			statement.params.global_id = global_id;
			statement.params.need_sync_screen = need_sync_screen;
			
			statement.execute();
			
			this.notifyObservers( "FVD.Toolbar-SD-Dial-Added" );
			
			return this.connection.lastInsertRowID;		
		}
		catch( ex ){
			dump( "Fail add new url ("+url+"): " + ex + "\r\n" );
		}		
	};
	
	this.generateGUID = function() {
		
		var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
		var string_length = 32;
		var randomstring = '';
		
		for (var i=0; i<string_length; i++) {
			var rnum = Math.floor(Math.random() * chars.length);
			randomstring += chars.substring(rnum,rnum+1);
		}
		
		return randomstring;
		
	};
		
	this._init();
}

fvd_speed_dial_Storage = new FVD_TOOLBAR_SD_STORAGE();
