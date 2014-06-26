// Add map to page
google.maps.event.addDomListener(window, 'load', initialize);

/* Map initialization function */
function initialize() {
	UIHandle.host = new google.maps.LatLng(40.4439, -79.9561); //defaut center before data is received
	// Setup map
	var mapOptions = {
		center: UIHandle.host,
		zoom: 8
	};
	UIHandle.map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
	UIHandle.infoWindow = new google.maps.InfoWindow();

	// Create 'no location' cloud symbol
	var cloud = new google.maps.Marker({
		position: UIHandle.bermuda,
	    	icon: cloudSym,
	    	map: UIHandle.map,
	    	zIndex: 0
	});

	// Create legend
	var legend = document.getElementById('legend');
	var div = document.createElement('div');
	div.innerHTML = '<fieldset><legend>Legend</legend>value1<br>value2<br>value3<br></fieldset>';
	legend.appendChild(div);
	UIHandle.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(document.getElementById('legend'));

}// end map initialize

window.onload = function websockInit(){
	window.WebSocket = window.WebSocket || window.MozWebSocket;
	UIHandle.websocket = new WebSocket('ws://127.0.0.1:9000');
	UIHandle.websocket.onopen = function () {
		setConnectionStatus('Connected!');
		recursiveAnim();
	};
	UIHandle.websocket.onerror = function () {
		setConnectionStatus('Error Connecting!');
	};
	UIHandle.websocket.onmessage = function (message) {
		getMessage(message.data);
	};
	 
	/*$('button').click(function(e) {
		e.preventDefault();
		websocket.send($('input').val());
		//websocket.send("list");
		//$('input').val('');
	});*/
}

/* Update Loop Functions */
var fps = 1000/0.5; // Set target FPS to 0.5
var start = Date.now();

function Update(){
	// Request data from client
	//console.log(sendMessage(1, '{"command":"list"}'));
	sendMessage(1, '{"command":"list"}');
}

function getMessage(dataStr){
	if(dataStr != null){
		// Compare new data to old
		processNewData(jsonToFlows(dataStr));
	}
}

// Set cross-browser animation frame function
var animFrame = window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame    ||
	window.oRequestAnimationFrame      ||
	window.msRequestAnimationFrame     ||
	null ;

// Recursively call animFrame()
function recursiveAnim(){
	var now = Date.now();
	var dt = now-start;
	if( dt >= fps ){
		start = now;
		Update();
	}
	//else{ console.log(dt+' < '+fps); }
	animFrame(recursiveAnim);
}

/* UI Routines */

/* Compares array of Flows to old data set (DataContainer.list), sorting Flows
 * into the groups: existing, new, removed.
 * Processes Flows appropriately according to the flow's group
 */
function processNewData(next) {
	var exists = new Array();	// holds flow for existing flows
					// exists[i] = next[i].getID()
	var news = new Array();		// holds flow for new flows
					// news[i] = next[i].getID()
	var removed = new Array();	// holds flow for removed flows
					// removed[i] = next[i].getID()
	

	// Determine existing and new flows
	for(var i=0; i<next.length; i++){
		var id = next[i].getID();

		if(DataContainer.hashtable[id] != undefined){ // if Flow exists	
			// add index to exists array
			exists.push(next[i]);
		}
		else{ // if Flow is new
			// add index to news array
			news.push(next[i]);
		}
	}//end for

	// Determine removed Flows
	for(var i=0; i<DataContainer.list.length; i++){
		if(DataContainer.list[i] != undefined){
			var id = DataContainer.list[i].getID();
			var found = false; // flag for if flow was found in exists array

			for(var j=0; j<exists.length; j++){
				// if flow is in list but not in exists, then it has been removed
				if(exists[j].getID() == id){
					found = true;
					break;
				}

			}//end for

			// Add this flow to the removed array if it is in list but not in exists
			if(!found){
				removed.push(DataContainer.list[i]);
			}
		}
	}//end for

	// remove UI elements
	for(var i=0; i<removed.length; i++){
		removeUIElems(removed[i]);
		DataContainer.remove(removed[i]); // remove this flow from DataContainer
	}//end for

	// update UI elements
	for(var i=0; i<exists.length; i++){
		updateUIElems(exists[i]);
	}//end for

	// create UI elements
	for(var i=0; i<news.length; i++){
		DataContainer.add(news[i]); // add this flow to DataContainer
		createUIElems(news[i]);
	}//end for
}

/* Creates new UI elements for the Flow passed in. */
function createUIElems(flow){
	//console.log("Creating element, id:"+flow.getID());
	// Create marker at flow endpoint
	var endpoint = locToGLatLng(flow.destLatLng());
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
		icons: [{icon: antSym, offset: '0', repeat: '40px'}],
		strokeColor: 'green',
		strokeWeight: 6,
		multiplier: countDestIP(flow.tuple.destIP),
		map: UIHandle.map,
		zIndex: 3
	});

	// Add event listner to path
	google.maps.event.addListener(UIHandle.paths[flow.getID()], 'click', function(event){
	var content = "Destination IP Address: "+flow.tuple.destIP;
	content += "<br>Duplicate ACKs: "+flow.DupAcks;
	content += "<br>Out of order packets: "+flow.OOPS;
	content += "<br>Window Scale: "+flow.WinScale;
	content += "<br>cwnd: "+flow.cwnd;
	content += "<br>Protocol: "+flow.tuple.protocol;
	pathClickEvent(event, content);
	});
}

/* Updates new UI elements for the Flow passed in. */
function updateUIElems(flow){
	//console.log("Updating element, id:"+flow.getID());

	var endpoint = locToGLatLng(flow.destLatLng());

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
		icons: [{icon: antSym, offset: '0', repeat: '40px'}],
		strokeColor: 'green',
		strokeWeight: 6,
		multiplier: countDestIP(flow.tuple.destIP),
		map: UIHandle.map,
		zIndex: 3
	});

	// Add event listner to path
	google.maps.event.addListener(UIHandle.paths[flow.getID()], 'click', function(event){
	var content = "Destination IP Address: "+flow.tuple.destIP;
	content += "<br>Duplicate ACKs: "+flow.DupAcks;
	content += "<br>Out of order packets: "+flow.OOPS;
	content += "<br>Window Scale: "+flow.WinScale;
	content += "<br>cwnd: "+flow.cwnd;
	content += "<br>Protocol: "+flow.tuple.protocol;
	pathClickEvent(event, content);
	});
}

/* Removes new UI elements for the Flow passed in. */
function removeUIElems(flow){
	//console.log("Removing element, id:"+flow.getID());

	UIHandle.markers[flow.getID()].setMap(null); // remove from map
	delete UIHandle.markers[flow.getID()]; // remove marker

	UIHandle.paths[flow.getID()].setMap(null); // remove from map
	delete UIHandle.paths[flow.getID()]; // remove path
}

function report(){
	//console.log("Report button clicked");
	UIHandle.infoWindow.close();
}

function centerMap(){
	map.fitBounds(mapBounds());
}

function sendMessage(type, arg){ 
	switch(type){
	case 1:		// Request Data
		return UIHandle.websocket.send(arg);
		//return clientSend(); // temp function call to simulate client
		break;
	case 2:		// Send Report
		report();
		break;
	}
}

function mapBounds(){
	var points = DataContainer.list;
	var bounds = new google.maps.LatLngBounds();
	bounds.extend(points[0].srcLatLng().toGLatLng()); // Add host latlng to bounds
	for (i=0; i<points.length; i++){	// Add each dest latlng to bounds
		bounds.extend(points[i].destLatLng().toGLatLng());
	}
	return bounds;
}

function writeToInfoPanel(content){
	var panel = document.getElementById('con-field');
	panel.innerHTML = "<legend>Connection Details</legend>"+content;
}

function setConnectionStatus(str){
	var panel = document.getElementById('con-stat');
        panel.innerHTML = str;
}

/* Converts dataObject's Location object to Google API's LatLng object */
function locToGLatLng(loc){
	return new google.maps.LatLng(loc.lat, loc.lng);
}

/* Returns the number of flows whose destIP matches ip */
function countDestIP(ip){
	var cnt = 0;
	for(var i=0; i<DataContainer.list.length; i++){
		if(DataContainer.list[i] != undefined){
			if(DataContainer.list[i].tuple.destIP == ip)
				cnt++;
		}
	}

	return cnt;
}
