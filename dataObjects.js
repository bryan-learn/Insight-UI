/* Data Objects */

/* Tuple: 5-tuple object that identifies a flow. 
 * Overloaded constructor:
 * 	Tuple(SrcIP, SrcPort, DestIP, DestPort)
 *	Tuple(jso)
 */
function Tuple(SrcIP, SrcPort, DestIP, DestPort){
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

function Tuple(jso){
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

/* Flow: Object that represents one data flow and it's corresponding web10G metrics.
 * Overloaded constructor:
 * 	Flow(tuple, priority, DupAcks, OOPS, cwnd, WinScale)
 * 	Flow(jso)
 * */
function Flow(tuple, priority, dupAcks, oops, cwnd, winScale){
	this.tuple = tuple;
	this.priority = priority;
	this.dupAcks = dupAcks;
	this.oops = oops;
	this.cwnd = cwnd;
	this.winScale = winScale;
	this.srcLatLng = function (){
		return geoIP.lookup(this.tuple.SrcIP);
	}
	this.destLatLng = function (){
		return geoIP.lookup(this.tuple.DestIP);
	};
	this.getID = function (){
		// Call tuple's getID function
		return this.tuple.getID();
	};
}

function Flow(jso){
	this.tuple = new Tuple(jso.tuple);
	this.priority = jso.priority;
	this.dupAcks = jso.dupAcks;
	this.oops = jso.oops;
	this.cwnd = jso.cwnd;
	this.winScale = jso.winScale;
	this.srcLatLng = function (){
		return geoIP.lookup(this.tuple.SrcIP);
	}
	this.destLatLng = function (){
		return geoIP.lookup(this.tuple.DestIP);
	};
	this.getID = function (){
		// Call tuple's getID function
		return this.tuple.getID();
	};
}

/* Data Container: Holds all of the flow data.
 * list: Array of Flows.
 * hashtable: Maps a Flow's ID to the index of it's flow object in list.
 * add(Flow flow): Adds a flow to list and updates the hashtable with the flow's index.
 * update(String flowID, Flow newFlow): Overwrites the flow identified by flowID with newFlow.
 * remove(String flowID): Deletes the corresponding flow from list and hashtable.
 * getByID(String flowID): Returns the flow stored in list matching on the flowID.
 * */
var DataContainer = {
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
}

/* Location
 * Object holding a Lattitude, Longitude ordered pair */
function Location(lat, lng){
	this.lat = lat;
	this.lng = lng;
}

/* GeoIP Table */
var geoIP = {
	bermuda: new Location(25.938287, -71.674805), // Default for unknown location
	table: new Object(),
	lookup: function (ip) {
		var res = null;
		if( this.table[ip] == undefined ){ // if ip address is not in table
			var t = JSON.parse(getRequest("http://freegeoip.net/json/"+ip));
			if( t != null){
				res = new Location(t.latitude, t.longitude);
				this.table[ip] = res;
			}else{
				res = this.bermuda;
				this.table[ip] = res;
			}
		}
		else {
			res = this.table[ip];
		}
		return res;
	}
}

/* Data Processing Routines */

/* Converts a propertly formated JSON string from the client to an array of Flows */
var lastBlob;
function jsonToFlows(strJSON){
	lastBlob = strJSON;
	var jso = JSON.parse(strJSON);
	jso = jso.DATA;

	var flows = new Array();

	for(var i=0; i<jso.length; i++){
		flows[i] = new Flow(jso[i]);
	}

	return flows;
}

function getRequest(url){
	var http = new XMLHttpRequest();
	http.open("GET", url, false);
	try{
		http.send();
	}catch(e){
		return null;
	}
	
	return http.responseText;
}

