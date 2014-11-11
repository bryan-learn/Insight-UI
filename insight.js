var debug = true;
var flowStats = new Array();
var dbFunc = function(){
  if(ctrl.view.selectedFlow != null){
    var flow = ctrl.view.selectedFlow;
    flowStats.push(flow);
  }
}
var lastBlob; // DEBUG

var toggleCollapse = function (e){
  $(e).nextAll("[class='info']").slideToggle('slow');
};

// Set cross-browser animation frame function
var requestAnimFrame = window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame    ||
  window.oRequestAnimationFrame      ||
  window.msRequestAnimationFrame     ||
  function(callback){ window.setTimeout(callback, 1000/ups) };

// Close the websocket before leaving the page
window.addEventListener('unload', function(event){UIHandle.websocket.close();} );

/* Data Container: Holds all of the flow data.
 * list: Array of Flows. Do not modify directly - use functions 'add', 'update', & 'remove' instead.
 * prevTable: Table to storage previous value of important tcp metrics. Cid is the key.
 * add(Flow flow): Adds a flow to list.
 * update(String flowID, Flow newFlow): Overwrites the flow identified by flowID with newFlow.
 * remove(String flowID): Deletes the corresponding flow from list.
 * getByID(String flowID): Returns the flow stored in list matching on the flowID.
 * */
DataContainer = {
  list: new Array(),

  prevTable: new Object(),

  // Adds a Flow to DataContainer
  add: function (flow){
    //this.table[con.tuple] = con;
    this.list.push(flow); // add flow to list
  },

  // Removes a Flow from DataContainer
  remove: function (flow) {
    delete this.list[this.list.indexOf(flow)]
  },

  // Removes all data and recreates new data structures
  destroy: function() {
    delete this.list;
    this.list = new Array();
  },

  getByCid: function (id) {
    var indx = null;
    $.each(this.list, function(i, v){
      if(v.cid == id){
        indx = i;
      }
    });
    if(indx != null){
      return this.list[indx];
    }
    else{
      return null;
    }
  },

  // Adds entry to prevTable
  setTableVal: function(key,name,val) {
    // create new object if key is not found
    if(this.prevTable[key] == undefined){
        this.prevTable[key] = new Object();
    }
    // set the property value
    this.prevTable[key][name] = val;
  },

  // Returns value of key,name pair
  getTableVal: function(key,name) {
      if(this.prevTable[key] == undefined || this.prevTable[key][name] == undefined){
          return null;
      }
      else{
          return this.prevTable[key][name];
      }
  },

  // Removes all entries that do not have a corresponding cid in list
  cleanPrevTable: function() {
    console.log('nothing here yet!');
  }
};

// Copies important metrics to prevTable for all flows in list
populatePrevTable = function() {
  $.each(DataContainer.list, function(i, v){
    /* Sender -> Receiver */
    //segments out
    if(v.SegsOut != undefined){
      DataContainer.setTableVal(v.cid, 'SegsOut', v.SegsOut);
    }
    //segments retransmitted
    if(v.SegsRetrans != undefined){
      DataContainer.setTableVal(v.cid, 'SegsRetrans', v.SegsRetrans);
    }
    //Number of octets of data in transmitted segments out
    if(v.DataOctetsOut != undefined){
      DataContainer.setTableVal(v.cid, 'DataOctetsOut', v.DataOctetsOut);
    }

    /* Receiver -> Sender */
    //segments in
    if(v.SegsIn != undefined){
      DataContainer.setTableVal(v.cid, 'SegsIn', v.SegsIn);
    }
    //Number of data segments lost or reordered on the path
    if(v.DupAckEpisodes != undefined){
      DataContainer.setTableVal(v.cid, 'DupAckEpisodes', v.DupAckEpisodes);
    }
    //octets of data in transmitted segments in    
    if(v.DataOctetsIn != undefined){
      DataContainer.setTableVal(v.cid, 'DataOctetsIn', v.DataOctetsIn);
    }
  });
}

// Message Types
MsgType = {
  DATA: 1,
  REPORT: 2
};

var mask = '125DE1D7,A00000,F98000,0,0,0';

/* Location
 * Object holding a Latitude, Longitude ordered pair 
 */
Location = function (lat, lng){
  this.lat = lat;
  this.lng = lng;
};

// Returns log base 10 of input value
log10 = function(x) {
  return Math.log(x)/Math.log(10);
};

/* ========== Model ========== 
 * View(s) and Controller(s) can poll for state changed.
 */
function Model() {

/* Tuple: 5-tuple object that identifies a flow. 
 * Overloaded constructor:
 *   Tuple(SrcIP, SrcPort, DestIP, DestPort)
 *  Tuple(jso)
 */

this.Tuple = {
  getID: function (){
    // Turn each value into string then concatenate
    plainStr = this.SrcIP.toString()+this.SrcPort.toString()+this.DestIP.toString()+this.DestPort.toString();

    return plainStr;
  }
};

this.Flow = {
  latLng: function(){
    return new Location(this.rem_lat, this.rem_long);
  },
  getID: function (){
    // Call tuple's getID function
    return this.tuple.getID();
  },
  drawn: false // Drawn is set to true once UI element is created for the flow.
};


/* Data Processing Routines */
this.last = 0;
this.ups = 1; // Updates Per Second : (0.5 -> once every 2 seconds) 
this.update = function (now){
  var dt = now-this.last; // Find delta between update calls
  if( dt >= 1000/this.ups ){ // Update if delta is large enough
    this.last = now; // Restart counter

    // Request new data from client
    if( UIHandle.websocket.readyState == UIHandle.websocket.OPEN ){
      var msg = new Object();
      var commandCnt = 1;

      // default command: list all connections with given mask
      msg['1'] = [{"command": "list"}];

      //check for filters to be applied - overwrite default if any filters are applied.
      if( $('#filter-exclude').prop('checked') === true ){
        msg[commandCnt.toString()] = [{"command": "exclude", "options": $('#exclude-list').val()}];
        commandCnt++;
      }
      if( $('#filter-include').prop('checked') === true ){
        msg[commandCnt.toString()] = [{"command": "include", "options": $('#include-list').val()}];
        commandCnt++;
      }
      if( $('#filter-filterip').prop('checked') === true ){
        msg[commandCnt.toString()] = [{"command": "filterip", "options": $('#filterip-list').val()}];
        //console.log(msg[commandCnt.toString()]);
        commandCnt++;
      }

      if( $('#filter-filterapp').prop('checked') === true ){
        msg[commandCnt.toString()] = [{"command": "appinclude", "options": $('#filterapp-list').val()}];
        commandCnt++;
      }
      msg[commandCnt.toString()] = [{"mask": mask.toString()}];
      this.sendMessage(MsgType.DATA, JSON.stringify(msg));
    }

    // Update selectedFlow if exists
    if(ctrl.view.selectedFlow != null){
      // Needed to update selectedFlow data due to data creation/destruction process
      ctrl.view.selectedFlow = DataContainer.getByCid(ctrl.view.selectedFlow.cid);
    }

    // Update Connection Details panel
    ctrl.view.writeFlowDetails();

    // Update Contact Info panel
    ctrl.view.refreshContactInfo();

    // Update Graph
    if(ctrl.view.selectedFlow != null){
      this.updateGraph( ctrl.view.selectedFlow, flowDeltas(ctrl.view.selectedFlow) );
    }

    //Debug function
    if(debug == true){
      dbFunc();
    }
  }
  requestAnimFrame(this.update);
}.bind(this);

/*
 * Replaces old data set (DataContainer.list) with newFlows.
 */
this.processNewData = function (newFlows){

  //Update prevTable before removing data
  populatePrevTable();

  // Remove old UI elements and store some metrics
  for(var i=0; i<DataContainer.list.length; i++){
          ctrl.view.removeUIElem(DataContainer.list[i]);
  }

  // Remove old Data elements
  DataContainer.destroy();
  
  // Create new Data elements
  for(var i=0; i<newFlows.length; i++){
    DataContainer.add(newFlows[i]);
  }

  // Create new UI elements
  for(var i=0; i<DataContainer.list.length; i++){
    ctrl.view.createUIElem(DataContainer.list[i], ctrl.view.countDestIP(DataContainer.list[i].tuple.DestIP));
  }

};

this.updateGraph = function(flow, deltas){
  if(flow){
    tsg_addDatapoint( new Array(deltas[0], deltas[1], flow.SmoothedRTT, flow.CurCwnd) );
    tsg_draw();
  }
};

this.jsonToFlows = function (inJSON){
  var jso = inJSON.DATA;
  var flows = new Array();

  for(var i=0; i<jso.length; i++){
    flows[i] = $.extend(true, flows[i], jso[i], this.Flow);
    flows[i].tuple = $.extend(true, flows[i].tuple, this.Tuple);
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

// Function that handles messages via websocket from Client
this.getMessage = function (dataStr){
  lastBlob = dataStr; // DEBUG

  if(dataStr != null){
    var json = JSON.parse(dataStr);
    var msgType = null;
    if(json.DATA !== undefined){
      msgType = MsgType.DATA;
    }else if(json.function == "report"){
      msgType = MsgType.REPORT;
    }

    switch(msgType){
      case MsgType.DATA:
        // Convert data to a JSON object then apply data.
        this.processNewData(this.jsonToFlows(json));
        //this.updateGraph( ctrl.view.selectedFlow, flowDeltas(ctrl.view.selectedFlow) );
        break;
      case MsgType.REPORT:
        if(json.result == "success"){ // success - show report
          ctrl.view.showReport();
        }else if(json.result == "failure"){ // failed - show error
          ctrl.view.reportFail();
        }
        break;
    }
  }
}.bind(this);

this.sendMessage = function (type, arg){ 
  switch(type){
    case MsgType.DATA:    // Request Data
      UIHandle.websocket.send(arg);
      break;
    case MsgType.REPORT:    // Send Report
      UIHandle.websocket.send(arg);
      break;
  }
}.bind(this);

flowDeltas = function(flow){
  var resultArray = new Array();
  
  resultArray.push( flow.DataOctetsOut - DataContainer.getTableVal(flow.cid,'DataOctetsOut') );
  resultArray.push( flow.DataOctetsIn - DataContainer.getTableVal(flow.cid,'DataOctetsIn') );
  return resultArray;
};

}// end of Model

UIHandle = {
  map: null,
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
  websocket: null,
  infoWindow: new google.maps.InfoWindow({maxWidth: 800})

};



/* ========== View ==========
 * Requests information from the Model to generate output.
 */
function View() {

// Flow that is currently selected by user
this.selectedFlow = null; 

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
  fillColor: '#FF0000',
  fillOpacity: 1,
  strokeColor: '#FF0000',
  scale: 1.5,
  strokeWidth: 1,
  anchor: new google.maps.Point(1,1)
};

/* Event handlers */
this.pathClickEvent = function (e, flow, loc){

  if(this.selectedFlow){
    if(flow.cid != this.selectedFlow.cid){
      tsg_clearData(); //clear graph data when switching flows
    }
  }

  this.selectedFlow = flow;

  localStorage.cid = flow.cid; // Copy flow reference to report

  localStorage.persist = 1; // TODO change to read from UI setting (UI element needs added)
  localStorage.interval = 0; // TODO change to read from UI setting (UI element needs added)

  /* pop-up to add path characteristics to filter */
  //content string for filter options table
  var contentStr = '<table border=0><tr><th>Filter</th><th>Value</th><th>Add/Remove</th></tr>';
  contentStr += '<tr><td>Exclude Port</td><td>'+flow.tuple.DestPort+'</td><td> <input id="chkbx-'+flow.cid+'-'+1+'" type="checkbox" onclick="filterlistValToggle(\''+flow.cid+'\','+1+')"/> </td></tr>';
  contentStr += '<tr><td>Include Port</td><td>'+flow.tuple.DestPort+'</td><td> <input id="chkbx-'+flow.cid+'-'+2+'" type="checkbox" onclick="filterlistValToggle(\''+flow.cid+'\','+2+');"/> </td></tr>';
  contentStr += '<tr><td>Include IP</td><td>'+flow.tuple.DestIP+'</td><td> <input id="chkbx-'+flow.cid+'-'+4+'" type="checkbox" onclick="filterlistValToggle(\''+flow.cid+'\','+4+');"/> </td></tr>';
  contentStr += '<tr><td>Include App</td><td>'+flow.tuple.Application+'</td><td> <input id="chkbx-'+flow.cid+'-'+6+'" type="checkbox" onclick="filterlistValToggle(\''+flow.cid+'\','+6+');"/> </td></tr>';
  
  //UIHandle.infoWindow.setContent('Add '+flow.tuple.DestIP+' to filter list?<br><input type="button" value="yes" onclick="filteripAppend(\''+flow.tuple.DestIP+'\');UIHandle.infoWindow.close()"/>');
  UIHandle.infoWindow.setContent(contentStr);
  UIHandle.infoWindow.setPosition(loc);
  UIHandle.infoWindow.open(UIHandle.map);

}.bind(this);

this.nodeClickEvent = function (e, loc, ip){
  UIHandle.infoWindow.setContent('Add '+ip+' to filter list?<br><input type="button" value="yes" onclick="filteripAppend(\''+ip+'\');UIHandle.infoWindow.close()"/>');
  UIHandle.infoWindow.setPosition(loc);
  UIHandle.infoWindow.open(UIHandle.map);
}.bind(this);

/* Map initialization function */
this.mapInit = function () {
  if(UIHandle.host == undefined || UIHandle.host == null){ //if host is not yet set
    request_location();
    if(UIHandle.host == undefined || UIHandle.host == null){ //if request_location failed (no browser support for navigator)
      UIHandle.host = new google.maps.LatLng(40.4439, -79.9561); //defaut center before data is received
    }
  }
  // Setup map
  var mapOptions = {
    center: UIHandle.host,
    zoom: 5 
  };
  UIHandle.map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

  // Create legend
  //var legend = document.getElementById('legend');
  //var div = document.createElement('div');
  //div.innerHTML = '<fieldset><legend>Legend</legend>value1<br>value2<br>value3<br></fieldset>';
  //legend.appendChild(div);
  //UIHandle.map.controls[google.maps.ControlPosition.RIGHT_TOP].push(document.getElementById('legend'));

}// end map initialize

/* UI Routines */

/* Creates new UI elements for the Flow passed in. */
this.createUIElem = function (flow, multi){
  // Create marker at flow endpoint
  var endpoint = this.locToGLatLng(flow.latLng());
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
    //icons: [{icon: packetSym, offset: '0', repeat: this.mapSymDensity( flow )}],
    strokeColor: this.mapPathColor( flow ),
    strokeWeight: this.mapPathWidth( flow ),
    multiplier: (Math.log(multi+1)),
    map: UIHandle.map,
    zIndex: 3
  });

  // Add event listener to path
  google.maps.event.addListener(UIHandle.paths[flow.getID()], 'click', function(event){
    this.pathClickEvent(event, flow, endpoint);
  }.bind(this));

  // Add event listener to destination marker 
  google.maps.event.addListener(UIHandle.markers[flow.getID()], 'click', function(event){
    //this.nodeClickEvent(event, endpoint, flow.tuple.DestIP);
  }.bind(this));


  flow.drawn = true;
}.bind(this);

/* Removes new UI elements for the Flow passed in. */
this.removeUIElem = function (flow){

  UIHandle.markers[flow.getID()].setMap(null); // remove from map
  delete UIHandle.markers[flow.getID()]; // remove marker

  UIHandle.paths[flow.getID()].setMap(null); // remove from map
  delete UIHandle.paths[flow.getID()]; // remove path
};

// Data to Graphics mapping functions
this.mapPathColor = function (flow){
  var maxVal = 255; //max color value (black: good -> red: bad)
  var loss = null; //Percent loss. Expected range: [0.0, 1.0]

  //Determine which direction majority of data is flowing
  if(flow.DataOctetsOut > flow.DataOctetsIn){ //outbound flow is larger
    loss = flow.SegsRetrans / flow.SegsOut;
  }
  else{ //inbound flow is larger
    loss = flow.DupAckEpisodes / flow.DataSegsIn;
  }
  
  if(isNaN(loss)){ //if divisor was zero, set loss to zero (no data sent)
    loss = 0;
  }

  flow.loss = loss; //store loss estimation 

  //Map relevent loss range [0.0001, 0.01] to color range [0, 255]
  var val = translateRange(log10(loss), -5, -2, 0, 255);

  hexVal = parseInt(val).toString(16); //convert from decimal to hexVal
  if(val < 16){ //if hex val only has 1 digit
    hexVal = '0'+hexVal; //pad with leading zero for #RRGGBB format
  }
  if(val > maxVal){ //prevent val from exceeding maxVal
    hexVal = 'FF';
  }
  return '#'+hexVal+'0000';
}.bind(this);

this.mapPathWidth = function (flow){
  var maxVal = 12; // max exponent in the scale (1*10^12) -> 1 Terabit/s
  var val = null;
  var deltaIn = null;
  var deltaOut = null;
 
  if( DataContainer.getTableVal(flow.cid, 'DataOctetsOut') != undefined && flow.DataOctetsOut != undefined){ //estimate outbound throughput
    deltaOut = flow.DataOctetsOut - DataContainer.getTableVal(flow.cid, 'DataOctetsOut');
  }
  if( DataContainer.getTableVal(flow.cid, 'DataOctetsIn') != undefined ){ //estimate inbound throughput
    deltaIn = flow.DataOctetsIn - DataContainer.getTableVal(flow.cid, 'DataOctetsIn');
  }

  //Determine which direction majority of data is flowing
  if(flow.DataOctetsOut > flow.DataOctetsIn){ //outbound flow is larger
    val = deltaOut; 
  }
  else{ //inbound flow is larger
    val = deltaIn;
  }
  val = val * 8; // # of bits
  val = log10(val); // get base 10 exponent [val: 3 -> 1x10^3 -> 1 Kbps]

  // check if value is valid for display (is finite and not too small)
  if( !isFinite(val) || val < 2){
    val = 2; //lines thiner than 2px are too hard to see
  }
  return val;
}.bind(this);

this.mapSymColor = function (val){
  return '#FF0000';
};

this.mapSymScale = function (val){
  return 1.5;
};

this.mapSymDensity = function (flow){
  maxVal = 200; //max number of pixels between symbols
  val = (flow.SndLimTransRwin + flow.DupAcksIn)/flow.DataOctetsOut; //"badness" ratio: # errors to amount of data out
  val = (1-val)*maxVal; //map "badness" value to screen values 
  return val+'px';
};

//Translates val from the old range to the new range. If val falls outside of the old range, it will be set to the closest extreme (min or max)
translateRange = function(val, oldMin, oldMax, newMin, newMax){
  //Check for val out of range
  if(val<oldMin){
    val = oldMin;
  }
  else if(val>oldMax){
    val = oldMax;
  }

  //Calculate span of each range
  oldSpan = oldMax - oldMin;
  newSpan = newMax - newMin;

  //Convert old range to [0,1] range
  scaledVal = ( val-oldMin )/oldSpan;

  //Convert [0,1] range to new range
  return newMin + ( scaledVal*newSpan )
};

this.report = function (){
  var command = '{"command":"report", "options":{"cid": ' +localStorage.cid + ', "persist": '+localStorage.persist+ ', "interval": '+localStorage.interval+', "uri":"' +localStorage.uri+ '", "port":' +localStorage.port+ ', "db":"' +localStorage.db+ '", "dbname":"' +localStorage.dbname+ '", "dbpass":"' +localStorage.dbpass+ '", "nocemail":"' +localStorage.nocemail+ '", "fname":"' +localStorage.fname+ '", "lname":"' +localStorage.lname+ '", "email":"' +localStorage.email+ '", "institution":"' +localStorage.institution+ '", "phone":"' +localStorage.phone+ '"}}';
  ctrl.model.sendMessage(MsgType.REPORT, command);
  //console.log("Report JSON: "+ command);

}.bind(this);

this.centerMap = function (){
  UIHandle.map.fitBounds(ctrl.view.mapBounds());
};

this.mapBounds = function (){
  var points = DataContainer.list;
  var bounds = new google.maps.LatLngBounds();
  bounds.extend(points[0].latLng.toGLatLng()); // Add host latlng to bounds
  for (i=0; i<points.length; i++){  // Add each dest latlng to bounds
    bounds.extend(points[i].latLng.toGLatLng());
  }
  return bounds;
};

this.writeFlowDetails = function (){
  // If a flow is selected
  if(this.selectedFlow != null){
    var contentStr = 'Application: ' + this.selectedFlow.tuple.Application;
    contentStr += '<br>Estimated Loss: ' + (this.selectedFlow.loss*100).toPrecision(5) +'%';

    // Iterate over each property of the Flow object.
    $.each(this.selectedFlow, function(key, val){
      if(key == 'tuple'){
        $.each(val, function(k,v){
          if( ((typeof v === 'number' || typeof v === 'string') && (k != 'Application')) ){
            contentStr += "<br>"+k+": "+v;
          }
        });
      }
      if( (typeof val === 'number' || typeof val === 'string') && (key != 'cid' && key != 'rem_lat' && key != 'rem_long' && key != 'loc_long' && key != 'loss') ){
        contentStr += "<br>"+key+": "+val;
      }
    });
 
    //update title
    $('#con-title').empty();
    $('#con-title').append('Connection Details'+' - Cid '+this.selectedFlow.cid);

    //update content
    $('#con-field').empty();
    $('#con-field').append(contentStr);
  }
  else{
    $('#con-field').empty();
  }
}.bind(this);

this.setConnectionStatus = function (str){
  $('#con-stat').html(str);
};

/* Converts dataObject's Location object to Google API's LatLng object */
this.locToGLatLng = function (loc){
  return new google.maps.LatLng(loc.lat, loc.lng);
};

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
};

// Set the content to be displayed in the modal box
this.setModalContent = function(htmlStr){
  $('#modal-content').empty();
  $('#modal-content').append(htmlStr);
}

// Toggle the modal box's visiblity
this.showModal = function(show) {
  if(show == true){
    $('#modal').css('display', 'block');
  }else if(show == false){
    $('#modal').css('display', 'none');
  }
};

// Pulls values from each contact-info-form field into persistent storage (html5 localStorage)
this.getContactInfo = function() {
  localStorage.fname = $('#fname').val(); 
  localStorage.lname = $('#lname').val(); 
  localStorage.email = $('#email').val(); 
  localStorage.institution = $('#institution').val(); 
  localStorage.phone = $('#phone').val(); 
}.bind(this);

// Checks if any contact-info-form fields are empty
this.hasContactInfo = function(){
  if( $('#fname').val() == "" | $('#lname').val() == "" |$('#email').val() == "" | $('#institution').val() == "" | $('#phone').val() == "" ){
    return false;
  }else{ return true; }
}.bind(this);

// Populates contact-info fields with persistent data storage (localStorage)
this.refreshContactInfo = function(){
  if( localStorage.hasContactInfo == 'true' ){
    $('#usr-fname').val(localStorage.fname);
    $('#usr-lname').val(localStorage.lname);
    $('#usr-email').val(localStorage.email);
    $('#usr-institution').val(localStorage.institution);
    $('#usr-phone').val(localStorage.phone);
  }
}.bind(this);

// Pop-up modal box to fill out contact-info-form
this.editContactInfo = function(){
  
  ctrl.view.setModalContent( $('#contact-info-form').html() );
  $('#fname').val(localStorage.fname);
  $('#lname').val(localStorage.lname);
  $('#email').val(localStorage.email);
  $('#institution').val(localStorage.institution);
  $('#phone').val(localStorage.phone);
  ctrl.view.showModal(true);
}.bind(this);

// Clears stored contact information from form and localStorage
this.clearContactInfo = function(){
  // clear localStorage
  delete localStorage.fname;
  delete localStorage.lname;
  delete localStorage.email;
  delete localStorage.institution;
  delete localStorage.phone;
 
  localStorage.hasContactInfo = false;

  // clear contact-info panel
  $('#fname').val('');
  $('#lname').val('');
  $('#email').val('');
  $('#institution').val('');
  $('#phone').val('');
}

// Submits Contact Info form and closes modal box
this.submitContactForm = function(){
  if( this.hasContactInfo() ){
    this.getContactInfo();
    localStorage.hasContactInfo = true;
    this.showModal(false);
    this.setModalContent('');
  }
}.bind(this);

// Displays report in modal box
this.showReport = function() {
  // Add exit button
  htmlStr = ' <a href="#" class=".close" onclick="ctrl.view.showModal(false)">&#10006</a> ';
  // Display report content
  htmlStr += '<h1>Report Sent</h1>'
    + '<br><h2>Contact Information</h2>'
    + '<br>First Name: '+localStorage.fname
    + '<br>Last Name: '+localStorage.lname
    + '<br>Email: '+localStorage.email
    + '<br>Institution: '+localStorage.institution
    + '<br>Phone Number: '+localStorage.phone
    + '<br><h2>Connection Information</h2>'
    + '<br>CID: '+localStorage.cid

  this.setModalContent(htmlStr);
  this.showModal(true);
}.bind(this);

// Displays report error Details
this.reportFail = function(){
  // Add exit button
  htmlStr = ' <a href="#" class=".close" onclick="ctrl.view.showModal(false)">&#10006</a> ';
  // Display report content
  htmlStr += '<h1>Failed to Send Report</h1>'
    + 'There was a problem connecting to the database.<br>'
    + '<input type="button" value="Resend" onclick="ctrl.view.report(); ctrl.view.showModal(false)"/>'
    + '<input type="button" value="Cancel" onclick="ctrl.view.showModal(false)"/>';

  this.setModalContent(htmlStr);
  this.showModal(true);
}.bind(this);



}// end View

// Convers an HSL color value to RGB.
// Assumes h, s, l are within the set [0,1]
// returns r, g, b in the set [0, 255]
function hslToRgb(h, s, l){
  var r, g, b;

  if(s == 0){
    r = g = b = l; // achromatic
  }
  else{
    function hue2rgb(p, q, t){
      if(t < 0) t += 1;
      if(t > 1) t -= 1;
      if(t < 1/6) return p + (q - p) * 6 * t;
      if(t < 1/2) return q;
      if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }
    
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return 'rgb('+ Math.round(r * 255) +','+ Math.round(g * 255) +','+ Math.round(b * 255) +')';
}

//Functions for filtering

//Prepares an ID string to be processed by jquery
function toJqID(id){
  return '#' + id.replace( /(:|\.|\{|\})/g, '\\$1' );
};

filterlistValToggle = function(cid, filterID){
  var checked = $(toJqID('chkbx-'+cid+'-'+filterID)).prop('checked');

  switch(filterID){
    case 1: //Exclude Port
      if(checked == true){ //append
        filterAppend('#exclude-list', DataContainer.getByCid(cid).tuple.DestPort );
      } else { //remove
        filterRemove('#exclude-list', DataContainer.getByCid(cid).tuple.DestPort );
      }
      break;
    case 2: //Include Port
      if(checked == true){ //append
        filterAppend('#include-list', DataContainer.getByCid(cid).tuple.DestPort );
      } else { //remove
        filterRemove('#include-list', DataContainer.getByCid(cid).tuple.DestPort );
      }
      break;
    case 3: //Exclude IP
      if(checked == true){ //append
        filterAppend('', DataContainer.getByCid(cid).tuple.DestIP );
      } else { //remove
        filterRemove('', DataContainer.getByCid(cid).tuple.DestIP );
      }
      break;
    case 4: //Include IP
      if(checked == true){ //append
        filterAppend('#filterip-list', DataContainer.getByCid(cid).tuple.DestIP );
      } else { //remove
        filterRemove('#filterip-list', DataContainer.getByCid(cid).tuple.DestIP );
      }
      break;
    case 5: //Exclude App
      if(checked == true){ //append
        filterAppend('', DataContainer.getByCid(cid).tuple.Application );
      } else { //remove
        filterRemove('', DataContainer.getByCid(cid).tuple.Application );
      }
      break;
    case 6: //Include App
      if(checked == true){ //append
        filterAppend('#filterapp-list', DataContainer.getByCid(cid).tuple.Application );
      } else { //remove
        filterRemove('#filterapp-list', DataContainer.getByCid(cid).tuple.Application );
      }
      break;
  }
};

filterAppend = function(filterID, value){
  var valArray = $(filterID).val().split(',');
  var newVals = new Array(); //holds values after cleansing & appending new value

  $.each(valArray, function(i,v){ //remove values that are repeats or empty
    if(valArray[i] != value && valArray[i] != ''){
      newVals.push(valArray[i]);
    }
  });
 
  newVals.push(value);

  $(filterID).val( newVals.toString() );
};

filterRemove = function(filterID, value){
  var valArray = $(filterID).val().split(',');
  var newVals = new Array(); //holds values after cleansing & removing value

  $.each(valArray, function(i,v){ //remove values that are repeats or empty
    if(valArray[i] != value && valArray[i] != ''){
      newVals.push(valArray[i]);
    }
  });
  
  $(filterID).val( newVals.toString() );
};

/* ========== Controller ==========
 * Sends commands to Model to change it's state.
 */
function Controller() {

this.model = new Model();
this.view = new View();

// Add map to page
//google.maps.event.addDomListener(window, 'load', this.view.mapInit);
this.view.mapInit();

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

var ctrl;

//Initialization after DOM load
var init = function(){
console.log('init');
  // Instantiate MVC
  ctrl= new Controller();
   
  // Initialize websocket
  ctrl.websockInit();
  
  //Initialize Grapher
  tsg_init('tsg-cvs', 4, ['green', 'blue', 'red', 'yellow']); //Prepare graph that can plot up to 4 lines
  tsg_setSeriesTitles(['BW Out', 'BW In', 'RTT', 'Cwnd']);
  
  $('#map-canvas').resizable({containment: "parent"});
  $('#map-canvas').resizeable("option", "minWidth", 150);
  $('#map-canvas').resizeable("option", "minHeight", $('#map-canvas').height() );
 
  // If no contact info found, ask user for info
  if( localStorage.hasContactInfo != "true"){
    ctrl.view.setModalContent( $('#contact-info-form').html() );
    ctrl.view.showModal(true);
  }
};

// Request geolocation
function request_location (){
  navigator.geolocation.getCurrentPosition(
    function(pos){ //success callback
      UIHandle.host = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude); //defaut center before data is received
    },
    function(err){ //error callback
      console.log('location request failed - setting to default location'); //TODO replace with better fall-back
      UIHandle.host = new google.maps.LatLng(40.4439, -79.9561); //defaut center (pgh)
      
      if(err.code == 1){
        console.log('Error: permission denied');
      }else if(err.code == 2){
        console.log('Error: position unavailable');
      }else if(err.code == 3){
        console.log('Error: position unavailable');
      }
    });
}

window.addEventListener("load", init, false);
