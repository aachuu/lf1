
var $ = jQuery.noConflict(); $(document).bind("mobileinit", function() {$.mobile.page.prototype.options.domCache = true;$.mobile.touchOverflowEnabled = true;});

var map, center, mapCenterType="default", defaultAddress = "USA", defaultKeyword="";
var searchLocStatus = "generic";
var searchLocationTypes ={none:"none", cl:"current location", cc:"clicked coordinates", sa:"search address", da:"drawn area"} ;
var searchLocationType = "";
var searchLocationCoords;
var markerList = [], highlighthedMakerList=[];
var categories={all:["bakery","cafe","meal_delivery","meal_takeaway","restaurant","convenience_store","food","gas_station","department_store","clothing_store","convenience_store","grocery_or_supermarket","hardware_store","home_goods_store","jewelry_store","shopping_mall","store","book_store","dentist","hospital","pharmacy","veterinary_care","bowling_alley","art_gallery","library","movie_rental","movie_theater","museum","park","stadium","spa","zoo","atm","bank"],bank:["atm","bank"],restaurant:["bakery","cafe","meal_delivery","meal_takeaway","restaurant","convenience_store","food"],healthcare:["dentist","hospital","pharmacy","veterinary_care"],gas:["gas_station"],shopping:["department_store","clothing_store","convenience_store","grocery_or_supermarket","hardware_store","home_goods_store","jewelry_store","shopping_mall","store","book_store"],entertainment:["bowling_alley","art_gallery","library","movie_rental","movie_theater","museum","park","stadium","spa","zoo"]};
var currentTransaction = null, searchCT = null, resultsCT = null, infoWindow = null, dateCorrection = 0, recognition, speak, mic, recognizing, final_transcript = "", interim_transcript = "", two_line = /\n\n/g, one_line = /\n/g;
var mapPolyline, mapPolygon, polyLinesPath, pathEquations, polygonPath;//, pathBounds; 

function initialize() {
	getCoordinates(defaultAddress, defaultKeyword, start, 4, true);
	getCurrectLoc();
	
	pageEventHandlers();headerFormatting();hdrFtrBtnHandlers();//TODO: use grids for footer buttons too and generalize formatting function for all pages based on parameters passed
	$("#searchForm").submit(function(event){
		event.preventDefault();
		//getReadyForsearch();
		search($("#nameSearch")[0].value);
		//console.log("submitted form with search field value : ", $("#nameSearch")[0].value);
	});
	
	$("#drawLines").click(drawLines);
	$("#test").click(testPolygon);
	
}

function search(keyword) {
	var selectedCategory;
	resetMarkers();
	
	var request = {
		location : map.getCenter(),// baseLatlng,
		name : keyword || "*",
		radius : '500000',
		//rankBy : google.maps.places.RankBy.DISTANCE,
		types : categories.all
	};
	//console.log(request);
	//if(selectedCategory) request.setTypes(selectedCategory);
	service = new google.maps.places.PlacesService(map);
	service.nearbySearch(request, searchCallback);//nearbySearch(request, searchCallback);//search(request, searchCallback);
}

function searchCallback(results, status) {
  if (status == google.maps.places.PlacesServiceStatus.OK) {
	  if(results && results.length>0){  
		  for (var i = 0; i < results.length; i++) {
		      var place = results[i];
		      console.log(place);
		      //createMarker(results[i]);
		      placeMarker(results[i].geometry.location, "", results[i]);//, atSelLoc, icon, deffer) {
		    }
	  }
	  else{
		  getAll($("#nameSearch")[0].value, placeMarker);
	  }
  }
  else if(google.maps.places.PlacesServiceStatus.ZERO_RESULTS){
	  getAll($("#nameSearch")[0].value, placeMarker);
  }
}

function createMarker(place) {
	  var placeLoc = place.geometry.location;
	  console.log("placeLoc : ", placeLoc);
	  var marker = new google.maps.Marker({
	    map: map,
	    position: place.geometry.location
	  });

	  google.maps.event.addListener(marker, 'click', function() {
	    infowindow.setContent(place.name);
	    infowindow.open(map, this);
	  });
	}


function resetMarkers() {
	if (markerList && markerList.length > 0) {
		for (i in markerList)
			markerList[i].setMap(null);
		markerList.length = 0;
	}
	if (highlighthedMakerList && highlighthedMakerList.length > 0) {
		for (j in highlighthedMakerList)
			highlighthedMakerList[j].setMap(null);
		highlighthedMakerList.length = 0;
	}
}


function getReadyForsearch() {
	console.log("in get ready for search!");
	//$(".touchProof").show();
	$.mobile.loading('show', {
		text : 'Fetching matching results..',
		textVisible : true,
		theme : 'b'// ,html: ""//will come back to apply a
					// tranparent(noclickable) background while loading results
					// - ?
	});// */
	var name = document.getElementById("name").value;
	var addr = document.getElementById("addr").value;

	var searchName = $("#nameSearch")[0].value;
	
	var searchCoords = $("#searchCoords").val();
	var searchAddress = (addr) ? addr : "";
	
	currentTransaction = new SRObject();
	searchCT = new SearchObj();
	resultsCT = new Array();
	searchCT.setName(name);
	searchCT.setAddress(searchAddress);
	//searchCT.setPc(pc);
	//searchAddress += pc ? " " + pc : "";// ((searchAddress!="")? " " : "") +
										// (pc)?pc:"";
	if (mapClickFlag == true) {
		search(name);
	} else {
		if (searchAddress != "") {
			smGetCoordinates(searchAddress, name, search);
		} else {
			smGetAddress(clickedCoords, false, true, name, search);// first
																	// bool - to
																	// prompt to
																	// be
																	// loaded/used
																	// for
																	// search,
																	// second
																	// bool - to
																	// display
		}
	}
	map.setCenter(clickedCoords);
}

function start(mapCenter, zoom, defaultFlag, keyword){
	
	if(mapCenterType!=="default"){return;};
	center = mapCenter;
	var myOptions = {
		zoom : zoom || 8,
		center : center,//clickedCoords,
		mapTypeId : google.maps.MapTypeId.ROADMAP,
		/*disableDefaultUI: true*/
		
		mapTypeControlOptions:{
			mapTypeIds: [google.maps.MapTypeId.ROADMAP,google.maps.MapTypeId.HYBRID,google.maps.MapTypeId.SATELLITE,google.maps.MapTypeId.TERRAIN],
			position: google.maps.ControlPosition.RIGHT_BOTTOM,
			style: google.maps.MapTypeControlStyle.DEFAULT//DROPDOWN_MENU//HORIZONTAL_BAR, DEFAULT
		}
	}
	mapholder = document.getElementById("mapholder");
	map = new google.maps.Map(mapholder, myOptions);
	mapCenterType = defaultFlag==true ? "default" : "current location";
	
	google.maps.event.addListenerOnce(map, "tilesloaded", initializeAutoComplete);
	
	var mhp = mapholder.parentElement.parentElement;
	$(mhp).bind('pageshow', function() {
		google.maps.event.trigger(map, 'resize');
		if (center)
			map.setCenter(center);
	});
	
}



function getCoordinates(address, keyword, callbackfn, cbp1zoom, defaultAddressFlag) {
	
	geocoder = new google.maps.Geocoder();
	geocoder.geocode({
		'address' : address
	}, function(results, status) {
		if (status == google.maps.GeocoderStatus.OK) {
			if (results[0]) {
				/*clickedCoords = results[0].geometry.location;
				$("#searchCoords").val(clickedCoords);
				placeMarker(clickedCoords, "Your Search location : " + address,	true);
				console.log("in getCoordinates : ", address, keyword, cbp1zoom, defaultAddressFlag, results[0].geometry.location, results[0].geometry.location.lat(), results[0].geometry.location.lng());*/
				var center = new google.maps.LatLng(results[0].geometry.location.lat(), results[0].geometry.location.lng());
				if (callbackfn && typeof (callbackfn) === "function") {
					callbackfn(center, (cbp1zoom || 8), defaultAddressFlag, keyword);
				}
			} else {
				console.log('getCoordinates : No results returned for '
						+ address + " and " + keyword);
			}
		} else {
			console.log("Reverse Geocoding for " + address + " and " + keyword
					+ " failed with status : " + status);
		}
	});
}

function getAll(address, callbackfn) {
	
	geocoder = new google.maps.Geocoder();
	geocoder.geocode({
		'address' : address
	}, function(results, status) {
		if (status == google.maps.GeocoderStatus.OK) {
			if(results && results.length>0){
				if (callbackfn && typeof (callbackfn) === "function") {
					for(var i=0;i<results.length; i++){
						var loc = new google.maps.LatLng(results[i].geometry.location.lat(), results[i].geometry.location.lng());
						callbackfn(loc,"", results[i]);//(cbp1zoom || 8), defaultAddressFlag, keyword);
					}
						
				}
			}
			/*
			if (results[0]) {
				/*clickedCoords = results[0].geometry.location;
				$("#searchCoords").val(clickedCoords);
				placeMarker(clickedCoords, "Your Search location : " + address,	true);
				console.log("in getCoordinates : ", address, keyword, cbp1zoom, defaultAddressFlag, results[0].geometry.location, results[0].geometry.location.lat(), results[0].geometry.location.lng());* /
				var center = new google.maps.LatLng(results[0].geometry.location.lat(), results[0].geometry.location.lng());
				if (callbackfn && typeof (callbackfn) === "function") {
					callbackfn(center, (cbp1zoom || 8), defaultAddressFlag, keyword);
				}
			} else {
				console.log('getCoordinates : No results returned for '
						+ address + " and " + keyword);
			}*/
		} else {
			//console.log("Reverse Geocoding for " + address + keyword? " and " + keyword : "" + " failed with status : " + status);
			console.log("Reverse Geocoding for " + address + " failed with status : " + status);
		}
	});
}

function initializeAutoComplete()
{

	//$(document).delegate('.ui-content', 'scrollstart', false);
	
	//$(document).delegate(".ui-content", "scrollstart", false);
	//$("#popupInfo").attr("max-height","30px").attr("overflow","scroll");
	
	//var ns1 = $("#nameSearch")[0]; 
	var input = $("#nameSearch")[0];//ns1;//(document.getElementById('nameSearch'));
	var autocomplete = new google.maps.places.Autocomplete(input);	
	autocomplete.bindTo('bounds', map);

	var infowindow = new google.maps.InfoWindow();
	  var marker = new google.maps.Marker({
	    map: map
	  });
/*
	  google.maps.event.addListener(autocomplete, 'place_changed', function() {
	    infowindow.close();
	    marker.setVisible(false);
	    console.log("checking abc!");
	    //input.className = '';
	    var place = autocomplete.getPlace();
	    if (!place.geometry) {
	      // Inform the user that the place was not found and return.
	      //input.className = 'notfound';
	      return;
	    }

	    // If the place has a geometry, then present it on a map.
	    if (place.geometry.viewport) {
	      map.fitBounds(place.geometry.viewport);
	    } else {
	      map.setCenter(place.geometry.location);
	      map.setZoom(17);  // Why 17? Because it looks good.
	    }
	    marker.setIcon(/** @type {google.maps.Icon} * /({
	      url: place.icon,
	      size: new google.maps.Size(71, 71),
	      origin: new google.maps.Point(0, 0),
	      anchor: new google.maps.Point(17, 34),
	      scaledSize: new google.maps.Size(35, 35)
	    }));
	    marker.setPosition(place.geometry.location);
	    marker.setVisible(true);

	    var address = '';
	    if (place.address_components) {
	      address = [
	        (place.address_components[0] && place.address_components[0].short_name || ''),
	        (place.address_components[1] && place.address_components[1].short_name || ''),
	        (place.address_components[2] && place.address_components[2].short_name || '')
	      ].join(' ');
	    }

	    infowindow.setContent('<div><strong>' + place.name + '</strong><br>' + address);
	    infowindow.open(map, marker);
	  });

	  // Sets a listener on a radio button to change the filter type on Places
	  // Autocomplete.

	  
	  function setupClickListener(id, types) {
	    var radioButton = document.getElementById(id);
	    google.maps.event.addDomListener(radioButton, 'click', function() {
	      autocomplete.setTypes(types);
	    });
	  }

	  setupClickListener('changetype-all', []);
	  setupClickListener('changetype-establishment', ['establishment']);
	  setupClickListener('changetype-geocode', ['geocode']);
*/	
}

function getCurrectLoc() {
	if (navigator.geolocation) {
	    navigator.geolocation.getCurrentPosition(
	    function(position){start(new google.maps.LatLng(position.coords.latitude,
	    	    position.coords.longitude));},
	    errorGettingPosition, {
	        'enableHighAccuracy': false,
	        'timeout': 5000,
	        'maximumAge': 0
	    });
	}
	else{
		alert("Geolocation is not supported!!!");
	}
}

function errorGettingPosition(err) {
    //showSearch(document.getElementById("searchTab"));
	console.log("error code : ", err);
    if (err.code == 1) {
        callPlayVoice("Please enter your location details and Search");
    } else if (err.code == 2) {
        showSearch(document.getElementById("searchTab"));
        callPlayVoice('Your position is currently unavailable. Please try searching or try again later');
    } else if (err.code == 3) {
        callPlayVoice('Your position is currently unavailable. Please try searching or try again later');
        console.log("Timeout expired.");
    } else {
        callPlayVoice("Please enter your location details and Search");
        console.log("ERROR:" + err.message);
    }
}

function callPlayVoice(text){
	console.log("To Play : " ,text);
	//alert(text);
}

/*
listItem.on('vclick', ".viewOnMap", function() {
	$.mobile.changePage("#mapview", {
		'markerIndex' : index
	});
	action(index, listItem);
});
*/

//SET MAP HEIGHT TO PAGE HEIGHT + 46.2PX TO HIDE THE MAP TYPE CHANGER CONTROL

/*
var footer = $("<footer>");
footer.attr('data-role',"footer")
	.attr("data-position","fixed")
	.attr("style","touch-overflow: scroll")
	.html('<nav data-role="navbar" data-iconpos="left">'
			+ '<ul data-count-theme="e">'
			+ '<li><a href="#search" data-icon="search" >Advanced Search</a></li>'
			+ '<li><a href="#results" data-icon="bars">Result List<span class="count-bubble"></span></a></li>'
			+ '<li><a href="#results" data-icon="bars">Result List<span class="count-bubble"></span></a></li>'
			+ '</ul></nav>');

*/

var headerObj = {
		start:'<div class="ui-grid-b">',
		
		logo:'<div class="ui-block-a" style="max-width:75px;width:10%;"><img src="./images/1.png" style="width:80%;padding-left:5%;padding-right:15%;"/></div>',
		nameSearch:'<div class="ui-block-b" style="width:75%;"><form id="searchForm"' + 
					' data-ajax=false action=""><input type="search" name="nameSearch"' + 
					' id="nameSearch" data-mini=true value="" data-theme="d" style="" placeHolder="Search Map"></input></form></div>',
		serarchSetting:'<div class="ui-block-c infoBlock mapPanel" ><a style=""' +
						' id="openOptions" data-icon="searchsetting" data-role="button"' +
						' data-rel="popup" href="#popuppanel1" data-iconpos="notext" data-origin-to="">Options</a></div>',
		end:'</div>'
};

var output = {
		start:'<nav data-id="mainTab" data-role="navbar"><ul id="footer_tabs">',
		/*defaultTabNames: ["search","lyr"],
		tabs:{
			search : '<li><a id="ftr_search" href="#search">Search</a></li>',
			res:'<li><a id="ftr_res">Results</a></li>',
			lyr:'<li><a id="ftr_lyr">Layers</a></li>'
		},*/
		defaultTabNames: ["drawLines","test"],
		tabs:{
			drawLines: '<li><a id="drawLines" href="#">Draw Lines</a></li>',
			test:'<li><a id="test">Test</a></li>'
		},
		
		end:'</ul></nav>'
}

function constructFooter(tabNames){
	var footer = output.start;
	tabNames = tabNames && tabNames.length >0 ? tabNames : output.defaultTabNames;
	for(var v=0;v<tabNames.length;v++){
		footer += output.tabs[tabNames[v]];
	}
	footer += output.end;
	return footer; 
}

function startDrawing(){

	
    var mapDownHandler, mapMoveHandler, polylineUpHandler, mapUpHandler, mapOutHandler;
    
    var mapHolder = document.getElementById("mapholder");
    mapHolder.addClass("mapDraw");
    map.setOptions({draggable: false}); 
    clearPrevDrawings();
    mapDownHandler = google.maps.event.addListener(map, 'mousedown', function (event) {
        addPtToPolyLine(event);
        mapMoveHandler = google.maps.event.addListener(map, 'mousemove', mapMove);
        mapUpHandler = google.maps.event.addListener(map, 'mouseup', removeAllHandlers);//mapUp);
        polylineUpHandler = google.maps.event.addListener(mapPolyline, 'mouseup', removeAllHandlers);//polylineUp);
        mapOutHandler = google.maps.event.addListener(map, 'mouseout', removeAllHandlers);/*function(event){
        	console.log("map mouseout :" + event);
        	removeAllHandlers();
        });*/
    });
     
    /* for tersting purposes only*/
    var polygonClick = google.maps.event.addListener(mapPolygon, 'click', function (event) {
        var myFn = mapPolygon.containsLatLng(event.latLng) ? "yes" : "no";
        var gFn = google.maps.geometry.poly.containsLocation(event.latLng,mapPolygon) ? "yes" : "no";
        alert("polygonClick : google contains : "+ gFn + " and my Contains : " + myFn);
    });
    var mapClick = google.maps.event.addListener(map, 'click', function (event) {
        var myFn = mapPolygon.containsLatLng(event.latLng) ? "yes" : "no";
        var gFn = google.maps.geometry.poly.containsLocation(event.latLng,mapPolygon) ? "yes" : "no";
        alert("mapClick : google contains : "+ gFn + " and my Contains : " + myFn);
    });/* end - for tersting purposes only*/

    function removeAllHandlers(event) {
    	map.setOptions({
            draggable: true
        });
    	document.getElementById("mapholder").removeClass("mapDraw");
        /*
    	google.maps.event.clearInstanceListeners(mapPolyline);
    	google.maps.event.clearInstanceListeners(map);
    	*/
    	google.maps.event.removeListener(mapMoveHandler);
    	google.maps.event.removeListener(mapDownHandler);
        google.maps.event.removeListener(polylineUpHandler);
        google.maps.event.removeListener(mapOutHandler);
        google.maps.event.removeListener(mapUpHandler);
        
        polygonPath = polyLinesPath;
        
        /* creating a complex polygon when closing the  polygon - only if the closing line intersects with polygon*/
        var complexPath=new google.maps.MVCArray();
        complexPath.setAt(0,polygonPath);
        for(var e=1;e<pathEquations.length-2;e++){
	        var pt = solveLinesEquations(equationOfLine(polyLinesPath.getAt(0), polyLinesPath.getAt(polyLinesPath.getLength() - 1)), pathEquations[e]);
	        if (pt != null) {
	        	//console.log("pt:", pt);
	        	//placeMarker(pt,"",pt);
	        	polyLinesPath.setAt(polyLinesPath.getLength(), pt);
	        	var newEq=equationOfLine(polyLinesPath.getAt(polyLinesPath.getLength()-1), polyLinesPath.getAt(polyLinesPath.getLength()-2));
	        	pathEquations.push(newEq);
	            
	            var newPath = new google.maps.MVCArray();
	            newPath.setAt(0,pt);
	            
	            var newPathCount = 1;
	            for (var e1 = e; e1 < polyLinesPath.getLength(); e1++) {
	            	newPath.insertAt(newPathCount++, polyLinesPath.getAt(e1));
	            }
	            complexPath.setAt(complexPath.getLength(),newPath);
	        }
        }
        
        //console.log("complexPath:",complexPath);
        
        mapPolygon.setOptions({
            paths: complexPath,//polygonPath,
            map: map
        });
        
        mapPolyline.setOptions({
        	path:new google.maps.MVCArray(),
        	map:null});
        
        //console.log("inside removeAllHandlers");
    }

    function mapUp(event){
    	//console.log("map mouseup :", event);
    	removeAllHandlers();
    }

    function polylineUp(event){
    	//console.log("polyline mouseup :", event);
    	removeAllHandlers();
    }
    
    function mapOut(event){
    	//console.log("map mouseout :" + event);
    	removeAllHandlers();
    };
    
    function mapMove(event){
    	
    	addPtToPolyLine(event);
        mapPolyline.setOptions({
            path: polyLinesPath
        });
        
        /**
        On each mouse move event:
        1. Add the new point to the polyLinePath, 
    	2. When there are 2 or more points on the polyLinePath
    	 	2.1 Add correspodning line equation and bounds into the pathEquations arrays
    	 	2.2 compare current line segment (bounds) with the polyLine line segements from 0 thrugh n-3rd line segment
    	 	 2.2.1 if bounds interfere => solve the line equations,  check if the point of intersection lies on/close to either of the lines and return point if truye, else null   
        **/
        
        if (pathEquations.length >2) {
            for (var e = 0; e < pathEquations.length - 3; e++) {
            	var pt = solveLinesEquations(pathEquations[pathEquations.length - 1], pathEquations[e]);
                if (pt != null) {
                	placeMarker(pt,"",pt);
                	//console.log("pt:", pt);
                	polyLinesPath.setAt((polyLinesPath.getLength() - 1), pt);
                    var newPathCount = 0;
                    var newPath = new google.maps.MVCArray();
                    for (var e1 = e; e1 < polyLinesPath.getLength(); e1++) {
                    	newPath.insertAt(newPathCount++, polyLinesPath.getAt(e1));
                    }
                    polyLinesPath = newPath;
                    removeAllHandlers();
                    break;
                }
            }
        }
    }
}

function hdrFtrBtnHandlers(){

	//HEADER btns events :
	
	$("#openOptions").bind('vclick', function() 
			{
				var w = $(window).height();
				var ww = $(window).width();
				var d = $(document).height();
				var hdr = $("#mapview header").height();
				var ftr = $("#mapview footer").height();
				var popuppanel1 = $("#popuppanel1");
				
				var newStyle = popuppanel1.attr("style") + ";" + "top:" + (hdr/2) + "px;"
				//+ "width:" + ww*0.6 + "px;"//+ "height:" + w-hdr-ftr-15 + "px;"
					+ "left:" + ww*0.4 + "px;";

				popuppanel1.attr("style",popuppanel1.attr("style") + ";top:"+(hdr/2)+"px");
				popuppanel1.width(ww*0.6);
				popuppanel1.height(w-hdr-ftr-15);
				popuppanel1.attr("left",ww*0.4+"px");
				
			});
	
	//FOOTER btns events
	$("#ftr_search").bind('vclick',function(){
		$.mobile.changePage("#mapview",{
			ftr:["res"]
		});
	});
} 

function pageEventHandlers(){
	//TODO: remove this after finalizing footer for each screen
	$("[data-role='page']").each(function(){
		var f = $(this).find("[data-role='footer']");
		//var c = constructFooter(this.id);
		var c = constructFooter();
		f.html(c).trigger("create");
	});
	//END TODO
	
	$(document).bind("pagebeforechange",function(e, data) {
			if (data.toPage == "#mapview") {
				var ftr = data.options && data.options.ftr ? data.options.ftr: null;
				console.log("details page index : " + ftr);
				var footer = constructFooter(ftr);				
			}
			/*if (data.toPage == "#mapview") {
				constructFooter("mapview");
			}*/
			//TODO : handle for all page transaction 
		});	
}

function headerFormatting()
{
	var blocka= $("#mapview header .ui-block-a");
	var blockb= $("#mapview header .ui-block-b");
	var blockc= $("#mapview header .ui-block-c");
	var logo = blocka.find("img"); 
	var header = $("#mapview header");
	blockc.width(blockc.find("a").width()+10);
	blockb.width(header.width()-blocka.width()-blockc.width());
	logo.attr("style",logo.attr("style") + ";padding-top:"+(blockb.height()-logo.height())/2+"px");
	var bWidth = blockb.width();
}

function placeMarker(markerLocation, comment, resObj){//, atSelLoc, icon, deffer) {
	/*
	var isCurrentLoc = (currentLoc && (markerLocation.lat() == currentLoc.lat() && markerLocation.lng() == currentLoc.lng()));
	var resultImg = "images/black-Inside-32.png";
	var selLocImg = "images/SearchLocation2.png";
	var currLocImg = "images/here2.png";
	var img = resultImg;
	if (atSelLoc === true) {
		var img = selLocImg;
		if (selLocMarker != null) {
			selLocMarker.setMap(null);
		}
	}
	if (isCurrentLoc) {
		img = currLocImg;
	}
	if (icon) {
		var img = new google.maps.MarkerImage(icon // url 
		, new google.maps.Size(30, 30)// size as in to shrink to 
		, new google.maps.Point(0, 0) //  origin - The position of the image within a sprite, if any.
										 
		, new google.maps.Point(15, 30) // anchor Point The position at which to anchor an image in correspondance to the location of the marker on themap. By default, the anchor is located along the center point of the* bottom of the image.
		, new google.maps.Size(30, 30) //scaledSize The size of the entire image after scaling, if any. Use this property to stretch/shrink an image or a sprite.
		);
	}
	*/
	var marker = new google.maps.Marker({
		position : markerLocation,
		//icon : img,
		animation : google.maps.Animation.DROP,
		map:map
		
	});
	
	/*
	if (!deffer)marker.setMap(map);
	if (atSelLoc === true) {selLocMarker = marker;} else if (!isCurrentLoc) {markerList.push(marker);}
	*/
	
	markerList.push(marker);
	
	google.maps.event.addListener(marker, 'click', function() {
		if (infoWindow)
			infoWindow.close();
		infoWindow = new google.maps.InfoWindow({
			content : resObj.toString()//comment
		});
		infoWindow.open(map, marker);
	});

	//marker.setBaseIcon(marker.getIcon());
	
	/*
	 * var hgIcon = new google.maps.MarkerImage( marker.getIcon() , new
	 * google.maps.Size(30,30) , new google.maps.Point(0,0) , new
	 * google.maps.Point(30,60) , new google.maps.Size(60,60) );
	 * marker.setHgIcon(hgIcon);
	 */
}

function addPtToPolyLine(event) {
	//placeMarker(event.latLng,"",event.latLng);
	if (polyLinesPath.getLength() > 0) {
        var prev = polyLinesPath.getAt(polyLinesPath.getLength() - 1);
        //console.log(prev.toUrlValue(20), event.latLng.toUrlValue(20));
        if (prev.toUrlValue(6) != event.latLng.toUrlValue(6)) {
            polyLinesPath.insertAt(polyLinesPath.getLength(), event.latLng);
            if (polyLinesPath.getLength() >= 2) {
                pathEquations.push(equationOfLine(event.latLng, polyLinesPath.getAt(polyLinesPath.getLength() - 2)));
            }
        }
    } else {
        polyLinesPath.push(event.latLng);
    }
}

function equationOfLine(pt1, pt2){
	
	var x1, x2, y1, y2, m, b;
    y1 = pt1.lat();
    x1 = pt1.lng();
    y2 = pt2.lat();
    x2 = pt2.lng();
    
    if (x2!==x1) {
        m = (y2-y1)/(x2-x1);
        b = y1-(x1 * m);
    } else {
        m = "Infinity";
        b = x1;
    }
    
    var lineBounds = new google.maps.LatLngBounds();
    lineBounds.extend(pt1);
    lineBounds.extend(pt2);
		
    return {
        m: m,
        b: b,
        p1: pt1,
        p2: pt2,
        bounds:lineBounds//,
        //toString:function(){console.log("Equation : " + m + " : " + b + " : (" + y1 + ", " + x1 + "), " + " : (" + y2 + ", " + x2 + ") ");} 
    };
}

function solveLinesEquations(l1, l2) {
	
	var bounds1 = l1.bounds;
	var bounds2 = l2.bounds;
	if(!bounds1.intersects(bounds2))
	{
		//console.log(l1,l2,"no intersecting bounds");
		return null;
	}
	//console.log("intersecting of bounds - proceeding with solving the lines");
	
	var m1 = +l1.m;
	var m2 = +l2.m;
    var b1 = l1.b;
    var b2 = l2.b;
    var l1p1 = l1.p1;
    var l1p2 = l1.p2;
    var l2p1 = l2.p1;
    var l2p2 = l2.p2;
    
    /*
     1. lines equations may be the same i.e., both m and b are same for both lines
	     1.a. overlapping line segments ==> use one of the interior points on the line and terminate drawing
	     1.b. one line segment included in the other ==> use one of the points on the interior line segment and terminate drawing//INVALID 
	     1.c. line segments at different places along the line ==> return null for point of intersection  
     2. lines may be parallel i.e., m is same, and b will be different ==> return null for point of intersection
     
     3. line may be along x axis => m=0
     4. line may be along y axis => m="Infinity" 
     5. lines may both be at an angle to each other ==> calculate point of intersection and return
     //neither m=0 nor m="Infinity"
     */
    
    var x, y;
    var pt = null;
    
    if(m1==m2){
    	if(b1==b2){
	    	if(l2.bounds.contains(l1p1))
	    			return l1p1;
		    	else if(l2.bounds.contains(l1p2))
		    		return l1p2;
		    	else
		    		return null;
	    }
    	else
    		return null;
    }
        
    if (isFinite(m1) && isFinite(m2)) {
        x = -(b1 - b2) / (m1 - m2);
        var y = (m1 * x) + b1;
        pt = new google.maps.LatLng(y, x);
    } 
    else 
    {
        if (!isFinite(m1) && isFinite(m2)) 
        {
            x = b1;
            y = (m2 * b1) + b2;
            pt = new google.maps.LatLng(y, x);
        } 
        else if (isFinite(m1) && !isFinite(m2)) 
        {
            x = b2;
            y = (m1 * b2) + b1;
            pt = new google.maps.LatLng(y, x);
        }
    }
    
    if(!pt){
    	console.log(("pt is null"));
    }
    if(pt && bounds1.contains(pt) && bounds2.contains(pt)) {
		console.log("Point of intersection found!! :", pt.lat(), " : " , pt.lng());
		return pt;
    }
    return null;
}

if (!google.maps.Polygon.prototype.getBounds) {
    google.maps.Polygon.prototype.getBounds = function (latLng) {
        var bounds = new google.maps.LatLngBounds();
        var paths = this.getPaths();
        var path;

        for (var p = 0; p < paths.getLength(); p++) {
            path = paths.getAt(p);
            for (var i = 0; i < path.getLength(); i++) {
                bounds.extend(path.getAt(i));
            }
        }
        return bounds;
    }
}

/*
google.maps.Polygon.prototype.containsLatLng = function (latLng) {
    var bounds = this.getBounds();
    if (bounds != null && !bounds.contains(latLng)) {
        return false;
    }
    var inPoly = false;
    var numPaths = this.getPaths().getLength();
    for (var p = 0; p < numPaths; p++) {
        var path = this.getPaths().getAt(p);
        var numPoints = path.getLength();
        var j = numPoints - 1;
        for (var i = 0; i < numPoints; i++) {
            var vertex1 = path.getAt(i);
            var vertex2 = path.getAt(j);
            if (vertex1.lng() < latLng.lng() && vertex2.lng() >= latLng.lng() || vertex2.lng() < latLng.lng() && vertex1.lng() >= latLng.lng()) {
                if (vertex1.lat() + (latLng.lng() - vertex1.lng()) / (vertex2.lng() - vertex1.lng()) * (vertex2.lat() - vertex1.lat()) < latLng.lat()) {
                    inPoly = !inPoly;
                }
            }
            j = i;
        }
    }
    return inPoly;
}
*/
google.maps.Polygon.prototype.containsLatLng = function(latLng) {
	
	if(google.maps.geometry.poly.containsLocation(latLng,this)){
		//console.log("true from google.maps.geometry.poly.containsLocation of google.maps.Polygon.prototype.containsLatLng");
		return true;
	}
	
	var lat, lng;
	if(arguments.length == 2) {
	    if(typeof arguments[0]=="number" && typeof arguments[1]=="number") {
	    	lat = arguments[0];
	    	lng = arguments[1];
		}
	} else if (arguments.length == 1) {
		var bounds = this.getBounds();

		if(bounds != null && !bounds.contains(latLng)) {
			return false;
		}
		lat = latLng.lat();
		lng = latLng.lng();
	} else {
		console.log("Wrong number of inputs in google.maps.Polygon.prototype.contains.LatLng");
	}

	// Raycast point in polygon method
	var inPoly = false;

	var numPaths = this.getPaths().getLength();
	for(var p = 0; p < numPaths; p++) {
	    var path = this.getPaths().getAt(p);
	    var numPoints = path.getLength();
	    var j = numPoints-1;
	
	    for(var i=0; i < numPoints; i++) {
	    	var vertex1 = path.getAt(i);
	    	var vertex2 = path.getAt(j);
	
	    	if (vertex1.lng() < lng && vertex2.lng() >= lng || vertex2.lng() < lng && vertex1.lng() >= lng) {
	    		if (vertex1.lat() + (lng - vertex1.lng()) / (vertex2.lng() - vertex1.lng()) * (vertex2.lat() - vertex1.lat()) < lat) {
	    			inPoly = !inPoly;
	    		}
	    	}
	    	j = i;
	    }
	    
	    if(inPoly)return inPoly;
	}
	return inPoly;
}

Element.prototype.addClass = function (className) {
    var ele = this;
    var classList = ele.getAttribute("class");
    var classMatch = classList ? classList.match(new RegExp("\\b" + className + "\\b", "ig")) : "";
    if (!classMatch || classMatch.length == 0) {
        ele.setAttribute("class", ele.getAttribute("class") + " " + className);
    }
}

Element.prototype.removeClass = function (className) {
    var ele = this;
    var classList = ele.getAttribute("class");
    var classMatch = classList ? ele.getAttribute("class").match(new RegExp("\\b" + className + "\\b", "ig")) : "";
    if (classMatch && classMatch.length > 0) {
        ele.setAttribute("class", ele.getAttribute("class").replace(className, ""));
    }
}

function clearPrevDrawings(){
	polyLinesPath = new google.maps.MVCArray();
	polygonPath = new google.maps.MVCArray();
	pathEquations = [];
	resetMarkers();
	if (mapPolyline) mapPolyline.setOptions({
	    path: polyLinesPath,
	    map: null
	});
	mapPolyline = new google.maps.Polyline({
	    strokeColor: '#0000ff',
	    strokeOpacity: 0.6,
	    strokeWeight: 3,
	    clickable: true,
	    geodesic: false,
        map: map
	});
	if (mapPolygon) mapPolygon.setOptions({
	    path: polygonPath,
	    map: null
	});
	mapPolygon = new google.maps.Polygon({
	    strokeColor: '#ff0000',
	    strokeOpacity: 0,//.5,
	    fillColor: '#ff5588',
	    fillOpacity: 0.20,
	    strokeWeight: 3,
	    clickable: true,
	    geodesic: false 
	});
}

function drawLines(){
	
	//equation(1,2,3,4).toString();
	//console.log("L1 : {1,8,{11,3},{14,6}} & L2 : {1,-8,{13,5},{16,8}}");
	
	var l1 = equation(25,12,25,20);
	var l2 = equation(0.5,0.5,2,2);

	var poly1 = new google.maps.Polyline({
	    strokeColor: '#0000ff',
	    strokeOpacity: 0.6,
	    strokeWeight: 3,
	    clickable: true,
	    geodesic: false,
        map: map,
        path:[l1.p1,l1.p2]
	});
	var poly2 = new google.maps.Polyline({
	    strokeColor: '#0000ff',
	    strokeOpacity: 0.6,
	    strokeWeight: 3,
	    clickable: true,
	    geodesic: false,
        map: map,
        path:[l2.p1,l2.p2]
	});
	
	var newBounds = l1.bounds;
	newBounds.extend(l2.p1);
	newBounds.extend(l2.p2);
	map.fitBounds(newBounds);
	
	test(l1,l2);
}

function test(l1,l2){
	
	var res = solveLinesEquations(l1,l2);
	res?placeMarker(res,"",res):null;
	console.log(res? res : "nope! no intersection");
	//console.log("In Test!! L1 : {1,1,{1,2},{3,4}} & L2 : {-1.5,32,{18,5},{16,8}}");
	//equationOfLine()
	
}



function equation(lat1,lng1,lat2,lng2){
	var p1 = new google.maps.LatLng(lat1,lng1);
	var p2 = new google.maps.LatLng(lat2,lng2);
	return equationOfLine(p1,p2);
}

var poly1;
function testPolygon(){
	if(poly1){
		poly1.setOptions({map:null,path:new google.maps.MVCArray()})
	}
	
	polyPath=new google.maps.MVCArray();
	
	polyPath.setAt(polyPath.getLength(),new google.maps.LatLng(16,11));
	polyPath.setAt(polyPath.getLength(),new google.maps.LatLng(14,5));
	polyPath.setAt(polyPath.getLength(),new google.maps.LatLng(11,2));
	polyPath.setAt(polyPath.getLength(),new google.maps.LatLng(8,3));
	polyPath.setAt(polyPath.getLength(),new google.maps.LatLng(6,4));
	polyPath.setAt(polyPath.getLength(),new google.maps.LatLng(5,7));
	polyPath.setAt(polyPath.getLength(),new google.maps.LatLng(6,10));
	polyPath.setAt(polyPath.getLength(),new google.maps.LatLng(9,11));
	polyPath.setAt(polyPath.getLength(),new google.maps.LatLng(13,9));
	polyPath.setAt(polyPath.getLength(),new google.maps.LatLng(18,6));
	
	
	poly1 = new google.maps.Polygon({
	    strokeColor: '#ff0000',
	    strokeOpacity: 0.5,
	    fillColor: '#ff5588',
	    fillOpacity: 0.50,
	    strokeWeight: 3,
	    clickable: true,
	    geodesic: false,
	    path:polyPath,
	    map:map
	});
	
	map.fitBounds(poly1.getBounds());
	var polyEquation = [];
	
	for(var a=0;a<polyPath.getLength();a++){

		if(a>=1 && polyPath.getLength() >= 2){
		    polyEquation.push(equationOfLine(polyPath.getAt(a), polyPath.getAt(a - 1)));
		}
	    
		if (polyEquation.length >2) {
	        for (var e = 0; e < polyEquation.length - 3; e++) {
	        	var pt = solveLinesEquations(polyEquation[polyEquation.length - 1], polyEquation[e]);
	            if (pt != null) {
	            	placeMarker(pt,"",pt);
	            	//console.log("pt:", pt);
	            	/*polyPath.setAt((polyPath.getLength() - 1), pt);
	                var newPathCount = 0;
	                var newPath = new google.maps.MVCArray();
	                for (var e1 = e; e1 < polyPath.getLength(); e1++) {
	                	newPath.insertAt(newPathCount++, polyLinesPath.getAt(e1));
	                }
	                polyLinesPath = newPath;
	                removeAllHandlers();
	                break;*/
	            }
	        }
	    }
	}
}

