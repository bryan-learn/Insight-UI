/* UI Objects */

var UIHandle = {
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
	}

};

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

antSym = {
	path: 'm30.25,4.625l-6.375,2.875l-1.375,6.25l4.375,5l-3,4l-6.75,-2.5l-1,-4.625l-2.375,0.25l0.75,5.25l9,3.875l-0.5,4.75l-10.75,0l0.25,2.5l10.875,-0.125l1.625,4.125l-7.5,3.5l-3.5,5.625l2.125,1.125l3.5,-5.125l6.5,-2.125l-2.5,6.125l0.5,6.5l4.375,3.375l4.75,2.125l4.125,-2.125l3.25,-3.625l0.75,-6.625l-3.625,-5l7.875,1.5l3.375,3.25l2,-1.375l-3.25,-4.125l-8.25,-1.875l0.875,-4.875l10.625,-0.375l-0.125,-2.5l-10.625,0.375l-1.25,-6l8,-3.75l0.25,-5.125l-3,0.125l-0.25,3l-5.625,3.125l-1.75,-2.875l2.875,-4.25l-2,-7.5l-7.25,-2.125z',
	fillColor: 'red',
	fillOpacity: 1,
	strokeColor: 'red',
	scale: 0.25,
	anchor: new google.maps.Point(30,30)
};

cloudSym = {
	path: 'm54.85827 61.440945l39.496063 -51.56693l136.04724 -9.874016l53.758514 29.622047l63.635193 -20.845144l105.32544 8.776903l57.05249 53.761158l103.131226 9.874016l17.553833 97.64566l-46.078735 65.82941l-26.333374 82.28346l-60.341187 53.76114l-86.67453 -28.524933l-63.635162 35.107635l-107.5197 4.3884277l-44.98163 -55.95276l-91.06299 1.0971375l-50.46982 -65.82941l7.6797905 -57.05249l-61.440945 -41.690292l3.2939632 -72.41207z',
	fillColor: '#E3F8FA',
	fillOpacity: 1,
	strokeColor: 'black',
	scale: 0.1,
	anchor: new google.maps.Point(300,200)
}

/* Event handlers */
function pathClickEvent(e, contentStr){
	/* Write Content to Connection Details Panel */
	writeToInfoPanel(contentStr);
	/* Pop-up Report Button */
	var str = '<div style="width: 200px; height: 100px;"><p>Report this connection to the Network Operation Center?</p><button type="button" id="reportButton" onclick="report()">Yes</button></div>';
	UIHandle.infoWindow.setContent(str);
	UIHandle.infoWindow.setPosition(e.latLng);
	UIHandle.infoWindow.open(UIHandle.map);
}




var interval = 40;
// Animate ants (and other symbols?)
function animateAnts(line){
	var count = 0;
	window.setInterval(function(){
		count = (count+1) % 100;
		var icons = line.get('icons');
		icons[0].offset = count + 'px';
		line.set('icons', icons);	
	}, interval);
}
var t;
function go(m){
	    t=curved_line_generate({
				
            latStart: DataContainer.list[1].srcLatLng().lat, 
            lngStart: DataContainer.list[1].srcLatLng().lng, 
            latEnd: DataContainer.list[1].destLatLng().lat, 
            lngEnd: DataContainer.list[1].destLatLng().lng,
	    strokeColor: 'green',
	    icons: [{icon: ant, offset: '0', repeat: '40px'}],
	    multiplier: m*0.5
        });
}


