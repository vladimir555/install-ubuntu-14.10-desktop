Components.utils.import("resource://fvd.speeddial.modules/async.js");

var FVDSDSingleImportExport = {
	EXPORT_FILE_EXTENSION: "sd",
	THUMBS_DIRECTORY_NAME: "thumbs",
	BG_FILE_NAME: "sd_bg.png",
	PREFS_FILE: "prefs.json",
	DB_FILE: "db.json",
	
	// import/export works only with this tables:
	tables: [ "deny", "dials", "dials_groups" ],
	
	sdSettingsSubBranch: "sd.",
	
	// constants for zipping file
	// listed here because mozilla have bug and not all interfaces contains this constants
	PR_RDONLY: 0x01,
	PR_WRONLY: 0x02,  
	PR_RDWR: 0x04,  
	PR_CREATE_FILE: 0x08,
	PR_APPEND: 0x10,  
	PR_TRUNCATE: 0x20,  
	PR_SYNC: 0x40,  
	PR_EXCL: 0x80,  

	
	/* Export / Import Dials and settings */
	
	exportData: function(){
		
		var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
		                  	.getService(Components.interfaces.nsIPromptService);
		
		try{
			var fileName = this._exportData();
			
			if( fileName ){
				
				promptService.alert( window, 
								 	fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "dialog.import_export.export_success.title"),
								 	fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "dialog.import_export.export_success.text").replace( "%file%", fileName ) );

			}
		}
		catch( ex ){
			dump( ex + "\r\n" );

			promptService.alert( window, 
								 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "dialog.import_export.export_failed.title"),
								 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "dialog.import_export.export_failed.text") + "("+ex+")" );
		}
	},
	
	importData: function(){
    var deck = document.querySelector("#syncTabs_import_export deck");
		try{

			this._importData( function(){
				
			} );
		}
		catch( ex ){

			dump( ex + "\r\n" );
			
			var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
		                  				  .getService(Components.interfaces.nsIPromptService);
			promptService.alert( window, 
								 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "dialog.import_export.import_failed.title"),
								 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "dialog.import_export.import_failed.text") );			
		}
		finally{
		  deck.selectedIndex = 0;
		}
		
	},
	
	_importData: function( callback ){
		var storage = fvd_speed_dial_speedDialSSD.storage;
		
		var filePicker = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
		
		filePicker.init(window, fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.import_file_picker.title" ), filePicker.modeOpen);
		filePicker.appendFilter( fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.export_file_picker.file_ext_title" ), "*." + this.EXPORT_FILE_EXTENSION);		
		filePicker.defaultExtension = this.EXPORT_FILE_EXTENSION;
		
		var result = filePicker.show();
		
		var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
		
		if ((result == filePicker.returnOK )){	
      var deck = document.querySelector("#syncTabs_import_export deck");    
      deck.selectedIndex = 1;		  
		  		
			if(!promptService.confirm( window, 
								 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "dialog.import_export.import_really.title"),
								 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "dialog.import_export.import_really.text") )){
			
				if( callback ){
					callback();
				}
				return false;
								 	
			}
			
			var dataDir = fvd_speed_dial_speedDialSSD._previewDir().parent;
			
			var zipReader = Components.classes["@mozilla.org/libjar/zip-reader;1"].createInstance(Components.interfaces.nsIZipReader);
			zipReader.open(filePicker.file);  	
			
			// read db file
			var dbData = JSON.parse( this._readZipEntryContent( zipReader, this.DB_FILE ) );
			// read prefs file
			var prefsData = JSON.parse( this._readZipEntryContent( zipReader, this.PREFS_FILE ) );			
			
			// clear specific tables
			for( var i = 0; i != this.tables.length; i++ ){
				var table = this.tables[i];
				storage.truncateTable( table );
			}
			
			// apply settings
			fvd_speed_dial_gFVDSSDSettings.importFromJSON( this.sdSettingsSubBranch, prefsData );
			
			// copy thumbs
			var entries = zipReader.findEntries( this.THUMBS_DIRECTORY_NAME + "/*" );
			while( entries.hasMore() ){				
				try{			
					var entry = entries.getNext();
					var tmp = entry.split("/");
					var thumbName = tmp[1];
													
					var thumbFile = fvd_speed_dial_speedDialSSD._previewDir();
					thumbFile.append( thumbName );
					
					if( thumbFile.exists() ){
						thumbFile.remove(false);
					}
					
					zipReader.extract( entry, thumbFile );					
				}
				catch( ex ){
					
				}
			}
			
			// check background file
			try{
				var bgFile = fvd_speed_dial_speedDialSSD._previewDir().parent;
				bgFile.append( fvd_speed_dial_speedDialSSD.FVD_SD_BG_FILE_NAME );
				zipReader.extract( this.BG_FILE_NAME, bgFile );
			}
			catch( ex ){
				
			}
			
			// restore db
			
			fvd_speed_dial_Async.arrayProcess(this.tables, function( table, apCallback ){
							
				if( table in dbData ){
					storage.importFromJSON( table, dbData[table], null, function(){
						apCallback();
					} );
				}
				else{
					apCallback();
				}
				
				
			}, function(){
				
				try{
					
					var observer = Components.classes['@mozilla.org/observer-service;1'].getService(Components.interfaces.nsIObserverService);
					
					gFVDSSD.sizeMigration();
					gFVDSSD.fixGuids();
					
					observer.notifyObservers( null, "FVD.Toolbar-SD-Dial-Shedule-Rebuild", null );
					observer.notifyObservers( null, "FVD.Toolbar-SD-Dial-Import-Success", null );
						
					/*
					fvd_speed_dial_speedDialSSD.buildCells();
					fvd_speed_dial_speedDialSSD.refreshGroupsList();
					fvd_speed_dial_speedDialSSD.refreshCurrentGroup();	
					*/
				}
				catch( ex ){
					dump("FAIL! " + ex + "\n");
				}
			
				if( callback ){
					callback();
				}

				promptService.alert( window, 
									 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "dialog.import_export.import_success.title"),
									 fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar",  "dialog.import_export.import_success.text") );
					
				});	
				
			

		}
		else{
		
		}
	},
	
	/**
	 * Generate current dials/settings export file and show it in the Save Dialog
	 */
    
	_exportData: function(){	
	

				
		var filePicker = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
		
		filePicker.init(window, fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.export_file_picker.title" ), filePicker.modeSave);
		filePicker.appendFilter( fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.export_file_picker.file_ext_title" ), "*." + this.EXPORT_FILE_EXTENSION);		
		filePicker.defaultExtension = this.EXPORT_FILE_EXTENSION;
		filePicker.defaultString = fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.export_file_picker.file_name" );
		
		var result = filePicker.show();
		
		if ((result == filePicker.returnOK ) || (result == filePicker.returnReplace)){
			
			// create zip archive
			var zipFile = this._tmpFile();
			var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");  
			var zipW = new zipWriter();  
			zipW.open(zipFile, this.PR_RDWR | this.PR_CREATE_FILE | this.PR_TRUNCATE);  
			
			// create database dump			
			var data = fvd_speed_dial_speedDialSSD.storage.dumpAll();
			var json = JSON.stringify( data );			
			var dbFile = this._tmpFile();
			this._writeFile( dbFile, json );	
			
			// create dump of settings
			var prefsFile = this._tmpFile();
			var prefsDump = JSON.stringify( fvd_speed_dial_gFVDSSDSettings.getAll( this.sdSettingsSubBranch ) );
			this._writeFile( prefsFile, prefsDump );	
			
			// add files to archive
			zipW.addEntryFile(this.DB_FILE, Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, dbFile, false);
			zipW.addEntryFile(this.PREFS_FILE, Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, prefsFile, false);
			
			// add thumbnails
			zipW.addEntryDirectory( this.THUMBS_DIRECTORY_NAME, 0, false );
			var thumbsDir = fvd_speed_dial_speedDialSSD._previewDir();
			
			var enumerator = thumbsDir.directoryEntries;
			
			while( enumerator.hasMoreElements() ){
				var thumbFile = enumerator.getNext();
				thumbFile.QueryInterface( Components.interfaces.nsIFile );		
				zipW.addEntryFile(this.THUMBS_DIRECTORY_NAME+"/"+thumbFile.leafName, Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, thumbFile, false);
			}
			
			// need to copy sd bg file
			var bgFile = fvd_speed_dial_speedDialSSD._previewDir().parent;
			bgFile.append( fvd_speed_dial_speedDialSSD.FVD_SD_BG_FILE_NAME );
			if( bgFile.exists() ){
				zipW.addEntryFile(this.BG_FILE_NAME, Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, bgFile, false);				
			}

						
			//zipW.addEntryFile("thumbs", Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, opener.speedDialSSD._previewDir(), false);			
			zipW.close();

			if( filePicker.file.exists() ){
				filePicker.file.remove(true);
			}
      
      var fileLeafName = filePicker.file.leafName;
      if(!/\.sd$/i.test(fileLeafName)){
        fileLeafName += ".sd";
      }
			zipFile.copyTo(filePicker.file.parent, fileLeafName); 
			
			try{
				// remove files
				zipFile.remove( false );			
				dbFile.remove( false );			
				prefsFile.remove( false );		
			}
			catch( ex ){
				
			}		
			
			return filePicker.file.leafName;		
		}		
		
		return null;
	},
	
	_readZipEntryContent: function( zipReader, entry ){
		var _iStream = zipReader.getInputStream( entry );
		var iStream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);  
		iStream.init( _iStream );			
		var result = iStream.read( _iStream.available() );
		iStream.close();
		_iStream.close();
		
		var utf8Converter = Components.classes["@mozilla.org/intl/utf8converterservice;1"].getService(Components.interfaces.nsIUTF8ConverterService);  
		var result = utf8Converter.convertURISpecToUTF8 (result, "UTF-8");  
		
		return result;
	},
	
	_tmpFile: function(){
		var file = Components.classes["@mozilla.org/file/directory_service;1"].  
        	getService(Components.interfaces.nsIProperties).  
        	get("TmpD", Components.interfaces.nsIFile); 
		
		
		file.append("sd_dump_"+this._getRandomInt() + "_" + this._getRandomInt() + "_");
		
		return file;
	},
	
	_getRandomInt: function(min, max){ 
		min = min || 0;
		max = max || 999999999999;
		
		return Math.floor(Math.random() * (max - min + 1)) + min;  
	},
	
	_writeFile: function( file, string ){
		var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].  
        				createInstance(Components.interfaces.nsIFileOutputStream);  
						
		foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);
		
		var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].  
                		createInstance(Components.interfaces.nsIConverterOutputStream);  
		converter.init(foStream, "UTF-8", 0, 0);  
		converter.writeString(string);  
		converter.close(); // this closes foStream  
	}
	
	
}



