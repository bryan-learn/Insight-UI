var lastBlob;
// Set cross-browser animation frame function
var requestAnimFrame = window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame    ||
	window.oRequestAnimationFrame      ||
	window.msRequestAnimationFrame     ||
	function(callback){ window.setTimeout(callback, 1000/ups) };

/* Data Container: Holds all of the flow data.
 * list: Array of Flows.
 * hashtable: Maps a Flow's ID to the index of it's flow object in list.
 * add(Flow flow): Adds a flow to list and updates the hashtable with the flow's index.
 * update(String flowID, Flow newFlow): Overwrites the flow identified by flowID with newFlow.
 * remove(String flowID): Deletes the corresponding flow from list and hashtable.
 * getByID(String flowID): Returns the flow stored in list matching on the flowID.
 * */
DataContainer = {
	list: new Array(),

	hashtable: new Object(),

	// Adds a Flow to DataContainer
	add: function (flow){
		//this.table[con.tuple] = con;
		this.list.push(flow); // add flow to list
		this.hashtable[flow.tuple.getID()] = this.list.indexOf(flow); // add flows's list index to hash table
	},

	// Updates a Flow in DataContainer
	update: function (tupleID, newFlow){
		// if the flows have the same ID (its the same flow)
		if( newFlow.tuple.getID() == this.list[this.hashtable[tupleID]].tuple.getID() ){
			this.list[this.hashtable[tupleID]] = newFlow; // reassign flow to newFlow
		}
	},

	// Removes a Flow from DataContainer
	remove: function (flow) {
		delete this.hashtable[flow.tuple.getID()];
		delete this.list[this.list.indexOf(flow)] // TODO fill undefined elements created by deleting
	},

	getByID: function (id) {
		return this.list[this.hashtable[id]];
	}
};

/* ========== Model ========== 
 * View(s) and Controller(s) can poll for state changed.
 */
function Model() {

/* Tuple: 5-tuple object that identifies a flow. 
 * Overloaded constructor:
 * 	Tuple(SrcIP, SrcPort, DestIP, DestPort)
 *	Tuple(jso)
 */
this.Tuple = function (SrcIP, SrcPort, DestIP, DestPort){
	this.SrcIP = SrcIP;
	this.SrcPort = SrcPort;
	this.DestIP = DestIP;
	this.DestPort = DestPort;
	//this.protocol = protocol;
	this.getID = function (){
		// Turn each value into string then concatenate
		plainStr = SrcIP.toString()+SrcPort.toString()+DestIP.toString()+DestPort.toString();

		return plainStr;
	};
}

this.Tuple = function (jso){
	this.SrcIP = jso.SrcIP;
	this.SrcPort = jso.SrcPort;
	this.DestIP = jso.DestIP;
	this.DestPort = jso.DestPort;
	//this.protocol = jso.protocol;
	this.getID = function (){
		// Turn each value into string then concatenate
		plainStr = this.SrcIP.toString()+this.SrcPort.toString()+this.DestIP.toString()+this.DestPort.toString();

		return plainStr;
	};
}

this.Flow = function (jso){
	this.tuple = new ctrl.model.Tuple(jso.tuple);
	this.cid = jso.cid;
	this.dupAcks = jso.DupAcksIn;
	this.octsAcked = jso.HCThruOctetsAcked;
	this.octsRcvd = jso.HCThruOctetsReceived;
	this.octsIn = jso.DataOctetsIn;
	this.octsOut = jso.DataOctetsOut;
	this.curRTO = jso.CurRTO;
	this.latLng = new ctrl.model.Location(jso.lat, jso.long);
	this.getID = function (){
		// Call tuple's getID function
		return this.tuple.getID();
	};
	this.drawn = false;
};


/* Location
 * Object holding a Lattitude, Longitude ordered pair */
this.Location = function (lat, lng){
	this.lat = lat;
	this.lng = lng;
};

/* Data Processing Routines */
this.last = 0;
this.ups = 0.5; // Updates Per Second : (0.5 -> once every 2 seconds) 
this.update = function (now){
	var dt = now-this.last;
	if( dt >= 1000/this.ups ){
		this.last = now;
		if( UIHandle.websocket.readyState == UIHandle.websocket.OPEN ){
			this.sendMessage(1, '{"command":"exclude", "options":"9000"}');
		}
	}
	requestAnimFrame(this.update);
}.bind(this);

/*
 * Replaces old data set (DataContainer.list) with newFlows.
 */
this.processNewData = function (newFlows){
	// Remove old UI elements
        for(var i=0; i<DataContainer.list.length; i++){
                ctrl.view.removeUIElem(DataContainer.list[i]);
        }

	// Remove old Data elements
	delete DataContainer.list;
	
	// Create new Data elements
	DataContainer.list = newFlows;

	// Create new UI elements
	for(var i=0; i<DataContainer.list.length; i++){
		ctrl.view.createUIElem(DataContainer.list[i], ctrl.view.countDestIP(DataContainer.list[i].tuple.DestIP));
	}

};

/* Converts a propertly formated JSON string from the client to an array of Flows */
this.jsonToFlows = function (strJSON){
	lastBlob = strJSON;
	var jso = JSON.parse(strJSON);
	jso = jso.DATA;
	var flows = new Array();

	for(var i=0; i<jso.length; i++){
		flows[i] = new this.Flow(jso[i]);
	}

	return flows;
}.bind(this);

this.getRequest = function (url){
	var http = new XMLHttpRequest();
	http.open("GET", url, false);
	try{
		http.send();
	}catch(e){
		return null;
	}
	
	return http.responseText;
}.bind(this);

// Function that handles messages via websoecket from Client
this.getMessage = function (dataStr){
	if(dataStr != null){
		// Convert data to JSON then compare new data to old
		this.processNewData(this.jsonToFlows(dataStr));
	}
}.bind(this);

this.sendMessage = function (type, arg){ 
	switch(type){
	case 1:		// Request Data
		return UIHandle.websocket.send(arg);
		break;
	case 2:		// Send Report
		ctrl.view.report();
		break;
	}
}.bind(this);

}// end of Model

UIHandle = {
	map: null,
	infoWindow: null,
	host: null,
	paths: new Object(),
	markers: new Object(),
	bermuda: new google.maps.LatLng(25.938287, -71.674805),
	addPath: function(id, path){
		this.paths[id] = path;
	},
	removePath: function(id){
		delete this.paths[id];
	},
	addMarker: function(id, marker){
		this.markers[id] = marker;
	},
	removeMarker: function(id){
		delete this.markers[id];
	},
	websocket: null

};

/* ========== View ==========
 * Requests information from the Model to generate output.
 */
function View() {

// Define custom symbols
nodeSym = {
	path: 'M0 0 m -8, 0 a 8,8 0 1,0 16,0 a 8,8, 0 1,0 -16,0',
	fillColor: 'blue',
	fillOpacity: 0.3,
	strokeColor: 'blue',
	strokeWeight: 3,
	scale: 0.5
};

lineSym = {
	path: 'M 0,-1 0,1',
	strokeOpacity: 1,
	scale: 4
};

packetSym = {
	path: 'M0,0 L2,2 M2,0 L0,2 M0,0 z', 
	fillColor: 'black',
	fillOpacity: 1,
	strokeColor: 'black',
	scale: 1.5,
	strokeWidth: 1,
	anchor: new google.maps.Point(1,1)
};

/* Event handlers */
this.pathClickEvent = function (e, contentStr){
	/* Write Content to Connection Details Panel */
	this.writeToInfoPanel(contentStr);
	/* Pop-up Report Button */
	var str = '<div style="width: 200px; height: 100px;"><p>Report this connection to the Network Operation Center?</p><button type="button" id="reportButton" onclick="ctrl.view.report()">Yes</button></div>';
	UIHandle.infoWindow.setContent(str);
	UIHandle.infoWindow.setPosition(e.latLng);
	UIHandle.infoWindow.open(UIHandle.map);
}.bind(this);

/* Map initialization function */
this.mapInit = function () {
	UIHandle.host = new google.maps.LatLng(40.4439, -79.9561); //defaut center before data is received
	// Setup map
	var mapOptions = {
		center: UIHandle.host,
		zoom: 8
	};
	UIHandle.map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
	UIHandle.infoWindow = new google.maps.InfoWindow();

	// Create legend
	var legend = document.getElementById('legend');
	var div = document.createElement('div');
	div.innerHTML = '<fieldset><legend>Legend</legend>value1<br>value2<br>value3<br></fieldset>';
	legend.appendChild(div);
	UIHandle.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(document.getElementById('legend'));

}// end map initialize

/* UI Routines */

/* Creates new UI elements for the Flow passed in. */
this.createUIElem = function (flow, multi){
	//console.log("Creating element, id:"+flow.getID());
	// Create marker at flow endpoint
	var endpoint = this.locToGLatLng(flow.latLng);
	UIHandle.markers[flow.getID()] = new google.maps.Marker({
		position: endpoint,
	    	icon: nodeSym,
	    	map: UIHandle.map,
		zIndex: 1
	});

	// Create path connection host and flow endpoint
	UIHandle.paths[flow.getID()] = curved_line_generate({
		path: [UIHandle.host, endpoint],
	    	strokeOpacity: '0.9',
		icons: [{icon: packetSym, offset: '0', repeat: this.mapSymDensity( Math.random() )}],
		strokeColor: this.mapPathColor( Math.random() /*(flow.octsOut-flow.octsAcked)/flow.octOut*/ ),
		strokeWeight: this.mapPathWidth(),
		multiplier: (Math.log(multi+1)),
		map: UIHandle.map,
		zIndex: 3
	});

	// Add event listner to path
	google.maps.event.addListener(UIHandle.paths[flow.getID()], 'click', function(event){
	var content = "Destination IP Address: "+flow.tuple.DestIP;
	content += "<br>Duplicate ACKs: "+flow.dupAcks;
	content += "<br>Data Octets In: "+flow.octsIn;
	content += "<br>Data Octets Out: "+flow.octsOut;
	content += "<br>HC Thru Octets Acked: "+flow.octsAcked;
	content += "<br>HC Thru Octets Received: "+flow.octsRcvd;
	content += "<br>Current RTO: "+flow.curRTO;
	this.pathClickEvent(event, content);
	}.bind(this));

	flow.drawn = true;
}.bind(this);

/* Updates new UI elements for the Flow passed in. */
/*this.updateUIElem = function (flow){
	//console.log("Updating element, id:"+flow.getID());

	var endpoint = this.locToGLatLng(flow.latLng);

	// Create marker at flow endpoint
	UIHandle.markers[flow.getID()].setMap(null); // remove from map
	delete UIHandle.markers[flow.getID()];
	UIHandle.markers[flow.getID()] = new google.maps.Marker({
		position: endpoint,
	    	icon: nodeSym,
	    	map: UIHandle.map,
		zIndex: 1
	});

	// Create path connection host and flow endpoint
	UIHandle.paths[flow.getID()].setMap(null); // remove from map
	delete UIHandle.paths[flow.getID()];
	UIHandle.paths[flow.getID()] = curved_line_generate({
		path: [UIHandle.host, endpoint],
	    	strokeOpacity: '0.9',
		icons: [{icon: packetSym, offset: '0', repeat: '40px'}],
		strokeColor: 'green',
		strokeWeight: 6,
		multiplier: this.countDestIP(flow.tuple.DestIP),
		map: UIHandle.map,
		zIndex: 3
	});

	// Add event listner to path
	google.maps.event.addListener(UIHandle.paths[flow.getID()], 'click', function(event){
	var content = "Destination IP Address: "+flow.tuple.DestIP;
	content += "<br>Duplicate ACKs: "+flow.DupAcks;
	content += "<br>Out of order packets: "+flow.OOPS;
	content += "<br>Window Scale: "+flow.WinScale;
	content += "<br>cwnd: "+flow.cwnd;
	content += "<br>Protocol: "+flow.tuple.protocol;
	this.pathClickEvent(event, content);
	}.bind(this));
}.bind(this); */

/* Removes new UI elements for the Flow passed in. */
this.removeUIElem = function (flow){
	//console.log("Removing element, id:"+flow.getID());

	UIHandle.markers[flow.getID()].setMap(null); // remove from map
	delete UIHandle.markers[flow.getID()]; // remove marker

	UIHandle.paths[flow.getID()].setMap(null); // remove from map
	delete UIHandle.paths[flow.getID()]; // remove path
}

// Data to Graphics mapping functions
this.mapPathColor = function (val){
	if(val < 0.33){	return '#66CCFF'; /* 'Good' : light blue */ }
	else if(val >= 0.33 & val < 0.66){return '#9933FF'; /* 'Okay' : light purple */ }
	else if(val >= 0.66){return '#660066'; /* 'Bad' : dark purple */ }
};

this.mapPathWidth = function (val){
	return 3;
};

this.mapSymColor = function (val){
	return '#000000';
};

this.mapSymScale = function (val){
	return 1.5;
};

this.mapSymDensity = function (val){
	if(val < 0.33){ return '50px'; }
	else if(val >= 0.33 && val < 0.66){ return '20px';}
	else if(val >= 0.66){ return '10px';}
};


this.report = function (){
	UIHandle.infoWindow.close();
}

this.centerMap = function (){
	map.fitBounds(mapBounds());
}

this.mapBounds = function (){
	var points = DataContainer.list;
	var bounds = new google.maps.LatLngBounds();
	bounds.extend(points[0].latLng.toGLatLng()); // Add host latlng to bounds
	for (i=0; i<points.length; i++){	// Add each dest latlng to bounds
		bounds.extend(points[i].latLng.toGLatLng());
	}
	return bounds;
}

this.writeToInfoPanel = function (content){
	var panel = document.getElementById('con-field');
	panel.innerHTML = "<legend>Connection Details</legend>"+content;
}

this.setConnectionStatus = function (str){
	var panel = document.getElementById('con-stat');
        panel.innerHTML = str;
};

/* Converts dataObject's Location object to Google API's LatLng object */
this.locToGLatLng = function (loc){
	return new google.maps.LatLng(loc.lat, loc.lng);
}

/* Returns the number of flows drawn onto the map whose DestIP matches ip */
this.countDestIP = function (ip){
	var cnt = 0;
	for(var i=0; i<DataContainer.list.length; i++){
		if(DataContainer.list[i] != undefined && DataContainer.list[i].drawn == true){
			if(DataContainer.list[i].tuple.DestIP == ip)
				cnt++;
		}
	}

	return cnt;
}

}// end View

/* ========== Controller ==========
 * Sends commands to Model to change it's state.
 */
function Controller() {

this.model = new Model();
this.view = new View();

// Add map to page
google.maps.event.addDomListener(window, 'load', this.view.mapInit);

/* Update Loop Functions */

// call Model's update loop
requestAnimFrame(this.model.update);

this.websockInit = function (){
	window.WebSocket = window.WebSocket || window.MozWebSocket;
	UIHandle.websocket = new WebSocket('ws://127.0.0.1:9000');
	UIHandle.websocket.onopen = function () {
		this.view.setConnectionStatus('Connected!');
	}.bind(this);
	UIHandle.websocket.onerror = function () {
		this.view.setConnectionStatus('Error Connecting!');
	}.bind(this);
	UIHandle.websocket.onmessage = function (message) {
		this.model.getMessage(message.data);
	}.bind(this);
	UIHandle.websocket.onclose = function () {
		this.view.setConnectionStatus('Connection Lost!');
		setTimeout( this.websockInit ,5000); // Attempt to reconnect every 5 seconds
	}.bind(this); 
}.bind(this);

}// end Controller


/* Instantiate MVC */
var ctrl = new Controller();

ctrl.websockInit();
