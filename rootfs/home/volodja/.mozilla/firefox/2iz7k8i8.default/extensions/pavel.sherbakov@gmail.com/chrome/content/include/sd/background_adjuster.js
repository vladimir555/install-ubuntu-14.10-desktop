FVDSDSSDBackgroundAdjuster = function(){
	this.color = "#FFFFFF";	
	this.defaultColor = "#FFFFFF";
	
	this.image = ""; //no image
	this.elem = null;
	this.imageInst = null;
	
	const STORAGE_FOLDER = "FVD Toolbar";
	const BG_FILE_NAME = "sd_bg.png";
	
	this.imageLocationType = "fill"; // (fill, fit, stretch, tile, center)
	
	this.getDefaultColor = function(){
		var color = "#fff";
		
		/*
		switch( fvd_speed_dial_gFVDSSDSettings.getStringVal( "sd.active_theme" ) ){
			case "dark":
				color = "#000";			
			break;
			default:
				color = "#fff";
			break;
		}
		*/
		
		return color;
	}
	
	this.currentBgUrl = function(){
		try{
	    	var file = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties).get('ProfD', Components.interfaces.nsIFile);
		    file.append(STORAGE_FOLDER);
		    
		    file.append(BG_FILE_NAME);
		    
		    // create a data url from the canvas and then create URIs of the source and targets  
		    var io = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
			    
		    var target = io.newFileURI(file)			
					
			return target.spec;
		}
		catch( ex ){
			return "";
		}
	}
	
	this.adjust = function( params ){
		params = params || {};
		
		if( !params.noflushimage ){
			this.imageInst = null;
		}

		if( this.imageLocationType == "no_image" ){
			this.image = "";
		}

		if( this.elem != null ){			
			var runSetup = false;
			
			if( this.image != "" ){
				if( this.imageInst != null ){
					runSetup = true;
				}
				else{
					this.imageInst = new Image();
					
					var inst = this;
					
					this.imageInst.onload = function(){
						inst.adjust({noflushimage: true});
					}
					
					this.imageInst.onerror = function(){
						inst.image = "";
						inst.adjust({noflushimage: true});
					}
					
					this.imageInst.src = this.image;					
				}	
			}
			else{
				runSetup = true;
			}
			
			if( runSetup ){
				this._setupBg();
			}
			
		}
	},
	
	this._setupBg = function(){
		this.elem.style.background = "none";		
						
		if( this.image ){		
			
			var elemWidth, elemHeight;
			
			try{
				var elemBox = this.elem.boxObject;			
				elemWidth = elemBox.width;
				elemHeight = elemBox.height;				
			}
			catch( ex ){
				
				elemWidth = this.elem.clientWidth;
				elemHeight = this.elem.clientHeight;
				
			}
			
			this.elem.style.background = "url("+this.image.replace( "(", "\\(" ).replace( ")", "\\)" )+")";
			
			if( this.adaptiveSize && this.imageInst ){
				var ratio = this.elem.boxObject.width / this.adaptiveSize.width;
				var bgWidth = Math.round(ratio * this.imageInst.width);
				var bgHeight = Math.round(ratio * this.imageInst.height);
				
				this.elem.style.backgroundSize = bgWidth+"px "+bgHeight+"px";
			}
			
			
			
			switch( this.imageLocationType ){
				case "fill":
					this.elem.style.backgroundPosition = "center center";
					this.elem.style.backgroundSize = "cover";
					this.elem.style.backgroundRepeat = "no-repeat";
				break;
				case "fit":
					this.elem.style.backgroundPosition = "center center";
					this.elem.style.backgroundSize = "contain";
					this.elem.style.backgroundRepeat = "no-repeat";			
				break;
				case "stretch":
					this.elem.style.backgroundSize = "100% 100%";
					this.elem.style.backgroundRepeat = "no-repeat";
				break;
				case "tile":
					
				break;
				case "center":
					this.elem.style.backgroundPosition = "center center";
					this.elem.style.backgroundRepeat = "no-repeat";
				break;				
			}	
			
			if( !this.adaptiveSize ){
				// if not specified adaptive size - this is not preview - set attachment as fixed
				this.elem.style.backgroundAttachment = "fixed";				
			}

			
			this.elem.style.backgroundColor = this.color;		
		}
		else{			
			this.elem.style.backgroundColor = this.color;
		}

	}
}