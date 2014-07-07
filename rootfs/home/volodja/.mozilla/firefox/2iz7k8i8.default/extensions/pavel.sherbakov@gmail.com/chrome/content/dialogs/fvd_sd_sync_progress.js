Components.utils.import("resource://fvd.speeddial.modules/sync.js");
Components.utils.import("resource://fvd.speeddial.modules/async.js");
Components.utils.import("resource://fvd.speeddial.modules/properties.js");
Components.utils.import("resource://fvd.speeddial.modules/settings.js");
Components.utils.import("resource://fvd.speeddial.modules/storage.js");

var data = arguments[0];

var inProgress = true;

var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);

var changeActiveCondCheckersCountCallback = null;

var eventObserver = {

	observe: function(subject, topic, data){
	
		if (topic == "FVD.Toolbar-SD-Sync-Cond-Checkers-Count-Changed") {
			if( changeActiveCondCheckersCountCallback ){
				changeActiveCondCheckersCountCallback();
			}
		}
		
	}
	
}

var observer = Components.classes['@mozilla.org/observer-service;1'].getService(Components.interfaces.nsIObserverService);

observer.addObserver( eventObserver, "FVD.Toolbar-SD-Sync-Cond-Checkers-Count-Changed", false );

function doneActive(){
	var items = document.querySelectorAll( "#syncStatuses > hbox" );
	
	for( var i = 0; i != items.length; i++ ){
		
		var item = items[i];
		
		if( item.hasAttribute( "status" ) && item.getAttribute( "status" ) == "active" ){
			item.setAttribute( "status", "done" );
		}
		
	}
}

function errorAll(){
	var items = document.querySelectorAll( "#syncStatuses > hbox" );
	
	for( var i = 0; i != items.length; i++ ){
		
		var item = items[i];
		
		item.setAttribute( "status", "error" );		
		
	}
}

function doneAll(){
	var items = document.querySelectorAll( "#syncStatuses > hbox" );
	
	for( var i = 0; i != items.length; i++ ){
		
		var item = items[i];
		
		item.setAttribute( "status", "done" );		
		
	}
}

function resetAll(){
	var items = document.querySelectorAll( "#syncStatuses > hbox" );
	
	for( var i = 0; i != items.length; i++ ){
		
		var item = items[i];
		
		item.removeAttribute( "status" );		
		
	}
}


function changeCloseWhenFinishedState(){
	var state = document.getElementById("closeWhenFinished").checked;
	fvd_speed_dial_gFVDSSDSettings.setBoolVal( "sd.sync.close_after_sync_progress", state );
}

function closeWhenFinished(){
	return document.getElementById("closeWhenFinished").checked;
}

function endWork(){
	
	fvd_speed_dial_Sync.releaseSyncLock(function(){
		if( closeWhenFinished() || data.closeOnFinish  ){
			window.close();
		}	
	});
	
}

function abort(){
 	if( !inProgress ){
	 	return;
	}	
	
	fvd_speed_dial_Sync.abortCurrentSync();
	document.getElementById( "syncingBox" ).setAttribute( "hidden", true );
	document.getElementById( "abortingBox" ).removeAttribute( "hidden" );
}

function tryAgain(){
	document.getElementById( "syncingBox" ).removeAttribute( "hidden" );
	document.getElementById( "errorBox" ).setAttribute( "hidden", true );		
	document.getElementById( "successBox" ).setAttribute( "hidden", true );		
	
	sizeToContent();
	
	resetAll();
	init();
}

function init(){
	
	document.getElementsByTagName("dialog")[0].getButton("extra1").setAttribute( "hidden", true );
	
	document.getElementById("closeWhenFinished").checked = fvd_speed_dial_gFVDSSDSettings.getBoolVal( "sd.sync.close_after_sync_progress" );
	
	function stateProcess( state, stateData ){
		doneActive();
		
		switch( state ){
			case "syncGroups":
				document.getElementById("syncStatus_groups").setAttribute( "status", "active" );
			break;
			
			case "syncDials":
				document.getElementById("syncStatus_dials").setAttribute( "status", "active" );						
			break;
			
			case "applyChanges":
				document.getElementById("syncStatus_applyChanges").setAttribute( "status", "active" );						
			break;
		}
		
		if( stateData ){
			if( typeof stateData.groupsCount != "undefined" ){
				//document.getElementById("syncGroupsCount").value = "( "+stateData.groupsCount+" "+ fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.sync.progress.synced" ) +" )";
			}
			if( typeof stateData.dialsCount != "undefined" ){
				//document.getElementById("syncDialsCount").value = "( "+stateData.dialsCount+" "+ fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.sync.progress.synced" ) +" )";
			}
		}
			
	}
	
	function finishCallback( error, _result ){
		inProgress = false;
		
		_result = _result || {};

		document.getElementById( "syncingBox" ).setAttribute( "hidden", true );
		document.getElementById( "abortingBox" ).setAttribute( "hidden", true );
		document.getElementById( "successBox" ).setAttribute( "hidden", true );
	
		if( error == 0 ){
			observer.notifyObservers( null, "FVD.Toolbar-SD-Dial-Sync-Completed", null );
			document.getElementById( "successBox" ).removeAttribute( "hidden" );
			doneAll();
		}
		else{
			errorAll();
			document.getElementById( "errorBox" ).removeAttribute( "hidden" );		
			document.getElementsByTagName("dialog")[0].getButton("extra1").removeAttribute( "hidden" );		
			
			if( error == fvd_speed_dial_Sync.Errors.ERROR_ALREADY_LOCKED ){
				promptService.alert( window, fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.alert.sync.lock_not_released_yet.title" ),
					fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.alert.sync.lock_not_released_yet.text" ) );
			}	
			else if( error == fvd_speed_dial_Sync.Errors.ERROR_COUNT_ITEMS_QUOTA_EXCEED ){
				
				fvd_speed_dial_Sync.quotaExceedMessageShow( {
					parent: window,
					count: _result.count,
					category: "dials_count"
				} );
				
			}		
			else if( error == fvd_speed_dial_Sync.Errors.ERROR_AUTH_FAILED ){
				fvd_speed_dial_Sync.loginIncorrectMessageShow({
					parent: window
				});
				window.close();
			}		
		}
		
		window.sizeToContent();
		
	}
	
	var message = fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.sync.progress.message." + data.syncType );
	
	document.getElementById("progressMessage").value = message;
	
	switch( data.syncType ){
		
		case "mergeLocalAndServerData":
			
			fvd_speed_dial_Sync.mergeLocalAndServerData( function( error, _result ){
				
				finishCallback( error, _result );
				endWork();
				
			}, stateProcess );
			
		break;
		
		case "overwriteServerData":
			
			fvd_speed_dial_Sync.overwriteServerData( function( error, _result ){
							
				finishCallback( error, _result );
				endWork();
				
			}, stateProcess );
			
		break;
		
		case "overwriteLocalData":
			
			fvd_speed_dial_Sync.overwriteLocalData( function( error, _result ){
				
				finishCallback( error, _result );
				endWork();
				
			}, stateProcess );
			
		break;
		
		case "applyServerUpdates":
			
			var updateInfo = data.updateInfo || fvd_speed_dial_Sync.getLastUpdateInfo();
			
			fvd_speed_dial_Sync.applyServerUpdates( function( error ){
				
				finishCallback( error );
				endWork();
				
			}, stateProcess, updateInfo.localLastUpdateTimeGroups, updateInfo.localLastUpdateTimeDials );
			
		break;
		
		case "uploadUpdatesAndCheckForUpdates":
		
			fvd_speed_dial_Sync.acquireSyncLock( function( error ){				
										
				if( error != 0 ){
					finishCallback( error );					
					return;
				}
			
				var toSyncData = fvd_speed_dial_Sync.getSyncData();	
				
				fvd_speed_dial_Async.chain([
					
					function( chainCallback ){
						
						if( fvd_speed_dial_Sync.activeCondCheckersCount() == 0 ){
							chainCallback();
						}
						else{
							
							var makingPreviews = document.getElementById("makingDialsPreviews");
						
							var msgLabel = document.getElementById("progressMessage");
							
							var prevText = msgLabel.value;
						
							msgLabel.value = fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.sync.progress.message.makePreviews" );
						
							//dump( "wait...\n" );
							changeActiveCondCheckersCountCallback = function(){
								
								if( fvd_speed_dial_Sync.activeCondCheckersCount() == 0 ){
									
									msgLabel.value = prevText;
															
									// reload to sync data
									toSyncData = fvd_speed_dial_Sync.getSyncData();	
									
									changeActiveCondCheckersCountCallback = null;
									chainCallback();
								}
								
							}
								
						}
						
					},
														
					function(){	
					
						resetAll();
						
						fvd_speed_dial_Sync.hasUpdates( function( error, has, updateInfo ){
							
							var conflicts = [];
							
							fvd_speed_dial_Async.chain([
							
								function( chainCallback ){
									
									if( has ){
										
										var savedChoice = null;
										
										// check for conflicts
										fvd_speed_dial_Sync.getUpdatesConflicts( updateInfo, function( _conflicts ){
											
											conflicts = _conflicts;
											
											fvd_speed_dial_Async.arrayProcess( conflicts, function( conflict, arrayProcessCallback ){
												
												if( conflict.solve ){
													// pre solved conflict
													arrayProcessCallback();
													return;
												}
												
												if( savedChoice ){
													conflict.solve = savedChoice;
												}
												else{
													
													var data = {
														save_choice: false,
														conflict: conflict
													};
													
													openDialog('chrome://fvd.speeddial/content/dialogs/fvd_sd_sync_conflict.xul', '', 'chrome,titlebar,toolbar,centerscreen,modal', data);		
													
													if( !data.conflict.solve ){
														finishCallback(fvd_speed_dial_Sync.Errors.ERROR_SYNC_USER_ABORTED);
														endWork();
														
														return;
													}
													
													if( data.save_choice ){
														savedChoice = data.conflict.solve;
													}
												}
												

												
												arrayProcessCallback();
												
											}, function(){
												
												chainCallback();
												
											} );
											
										} );
										
									}
									else{
										chainCallback();
									}
									
									
								},
								
								function( chainCallback ){
									
									// solve conflicts on user choices
									
									//dump( "SOLVE: " + conflicts.length + "\n" );
									
									conflicts.forEach(function( conflict ){
										
										//dump( conflict.id + ": " + conflict.solve + "\n" );
										
										if( conflict.solve == "server" ){
											
											if( conflict.type == "dial" ){
												fvd_speed_dial_Sync.removeSyncData( ["dials", "newDials", "deleteDials"], conflict.id );	
												
												// is special action, move dial to not exists group, that sync available
												if( conflict.inNoSyncGroupOnLocal ){
													
													//dump( "MOVE " + conflict.dataClient.rowid + " TO 0\n" );
													
												 	fvd_speed_dial_Storage.moveDial( conflict.dataClient.rowid, 0 );
												}																														
											}
											
											if( conflict.type == "group" ){
												fvd_speed_dial_Sync.removeSyncData( ["groups", "newGroups", "deleteGroups"], conflict.id );		
												
												if( conflict.dataClient == "nosync" ){
													
													// set groups as sync
													var groupId = fvd_speed_dial_Storage.groupIdByGlobalId( conflict.id ); 
													
													if( groupId ){
														fvd_speed_dial_Storage.updateGroupData( groupId, {
															sync: 1
														} );
													
														fvd_speed_dial_Sync.removeSyncData( ["groups", "newGroups"], conflict.id );	
														
														//dump( "SYNC DATA: " + JSON.stringify( fvd_speed_dial_Sync.getSyncData() ) + "\n" );
														
													}
													
												}
												else{
													
													if( conflict.dataServer == "removed" ){
														// remove group contents from sync														
														var groupId = fvd_speed_dial_Storage.groupIdByGlobalId( conflict.id ); 
														var dialsGlobalIds = fvd_speed_dial_Storage.getDialsGlobalIdsByGroup( groupId );
														
														dialsGlobalIds.forEach(function( dialGlobalId ){
															fvd_speed_dial_Sync.removeSyncData( ["dials", "newDials", "deleteDials"], dialGlobalId )
														});
																																									
													}
																										
												}
								
											}
											
										}
										else if( conflict.solve == "local" ){
											
											if( conflict.type == "group" && conflict.dataServer == "removed" ){
												
												// set all group dials to sync
												var groupId = fvd_speed_dial_Storage.groupIdByGlobalId( conflict.id );
												
												fvd_speed_dial_Sync.syncData( ["groups"], conflict.id );		
												
												var dials = fvd_speed_dial_Storage.listDials( false, groupId ); 
												
												dials.forEach( function( dial ){
													
													fvd_speed_dial_Sync.syncData( ["dials", "newDials"], fvd_speed_dial_Storage.dialGlobalId( dial.id ) );		
													
												} );
												
											}
											
										}										
									});
									
									chainCallback();
									
								},
								
								function( chainCallback ){
									
									// process special actions
									
									fvd_speed_dial_Async.arrayProcess( toSyncData.specialActions, function( specialAction, arrayProcessCallback ){
										
										if( specialAction.indexOf( "merge_group" ) == 0 ){
											
											resetAll();
										
											document.getElementById( "errorBox" ).setAttribute( "hidden", true );		
											document.getElementById( "successBox" ).setAttribute( "hidden", true );
											
											var tmp = specialAction.split( ":" );
											
											var groupId = tmp[1];
											var groupGlobalId = tmp[2];
											
						
											fvd_speed_dial_Sync.mergeLocalAndServerDataGroup( {
												groupGlobalId: groupGlobalId,
												groupId: groupId
											}, function(){
												
												arrayProcessCallback();
												
											}, stateProcess );
						
				
										}
										else{
											arrayProcessCallback();
										}
										
									}, function(){
										chainCallback();
									} );
									
								},
								
								function(){
									
									fvd_speed_dial_Sync.uploadUpdates( function( errorUploadUpdates, _result ){
																		
										finishCallback( errorUploadUpdates, _result );
															
										if( has ){
											
											fvd_speed_dial_Sync.setState( "wait_update_confirm" );
											
											var lastUpdateTime = Math.max( updateInfo.lastUpdateTimeDials, updateInfo.lastUpdateTimeGroups );
											var message =
												fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.sync.progress.confirm.has_updates.text" ).
												replace("%date%", new Date(lastUpdateTime).toLocaleString());
											
											var Ciprompt = Components.interfaces.nsIPromptService;
								
											var _checkState = {};
											
											// now working without confirm - automatic server updates apply
											if ( true /*0 ==
											promptService.confirmEx(window, fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.sync.progress.confirm.has_updates.title" ), message, (Ciprompt.BUTTON_POS_0) * (Ciprompt.BUTTON_TITLE_OK) +
											(Ciprompt.BUTTON_POS_1) * (Ciprompt.BUTTON_TITLE_IS_STRING) +
											Ciprompt.BUTTON_POS_1_DEFAULT, "", "Skip", null, null, _checkState)*/) {
											
												data.syncType = "applyServerUpdates";
												data.updateInfo = updateInfo;
												
												//resetAll();
												//init();
												
												tryAgain();
												
											}
											else {
												fvd_speed_dial_Sync.setState( "normal" );
												endWork();
											}
							
											
										}
										else{
											endWork();
										}
										
									}, stateProcess );
									
								}
							]);
							
							
						} );
						
					}
				
				]);
				
			} );

			
						
		break;
		
		
	}
	
}



window.addEventListener( "load", function(){
	
	init();
	
}, false );

window.addEventListener( "dialogcancel", function( event ){

	if( inProgress ){
		
		if( fvd_speed_dial_Sync.isCancellableSync( data.syncType ) ){
			var r = promptService.confirm( 
				window, fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.sync.progress.confirm.abort.title" ),
				fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.sync.progress.confirm.abort.text" ) );
			if( r ){
				abort();
			}
		}
		else{
			promptService.alert( window, fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.sync.progress.alert.cannot_abort.title" )
				, fvd_speed_dial_FVDSSDToolbarProperties.getString( "fvd.toolbar", "sd.sync.progress.alert.cannot_abort.text" ) );
		}
		
		event.preventDefault();
	}
	
	
	
}, true );
