Array.prototype.max = function () {
    return Math.max.apply(Math, this);
};

Array.prototype.min = function () {
    return Math.min.apply(Math, this);
};

var tsg_data;               //Array of values to plot a line in a graph
var tsg_maxLength = 60;     //Max number of datapoints for a plotted line
var tsg_graphs;             //Array of line graphs 
var tsg_yaxes;              //Array of y-axis labels - parallel to tsg_data and tsg_graphs
var tsg_canvas = null;      //Canvas element for graphs to be draw on
var tsg_cxt = null;         //Store canvas element's context for convenience

var tsg_draw = function() { 
    tsg_cxt.clearRect( 0,0,tsg_canvas.width,tsg_canvas.height );  //Clear canvas before redrawing
    for(var i=0; i<tsg_graphs.length; i++){
        tsg_graphs[i].original_data = [tsg_data[i]]; //update the graph's dataset
        tsg_graphs[i].draw();   //draw the graph
        tsg_yaxes[i].set('max', tsg_graphs[i].scale2.max);    //update y-axis scale
        tsg_yaxes[i].draw();    //draw the y-axis
    }
}.bind(this);

//Input: single or 2d array. In 2d array, each subarray is treated as a seperate metric
var tsg_setData = function(dataArray){
    tsg_data = dataArray;
};

//Sets data series title on y-axis
//Input: Array of title strings parallel to data series array
var tsg_setSeriesTitles = function(titles){
    if(titles.length = tsg_data.length){ //skip if input array is not correct size
        for(var i=0; i<tsg_data.length; i++){
            tsg_yaxes[i].set('title', titles[i]);
        }
    }
};

var tsg_clearData = function(){
    for(var i=0; i<tsg_data.length; i++){
        tsg_data[i] = new Array(tsg_maxLength);
    }
};

//Input: 1d array of datapoints each representing a seperate metric
var tsg_addDatapoint = function(datapoints){
    for(var i=0; i<tsg_data.length; i++){
        if(tsg_data[i].length >= tsg_maxLength){
            tsg_data[i].shift();
        }
        tsg_data[i].push(datapoints[i]);
    }
};

//Input: 
//  canvasID: ID tag of canvas element to draw on
//  numLines: Max number of data series (lines) the graph should draw
//  colors: Array of color strings for each data series to be drawn as
var tsg_init = function(canvasID, numLines, colors){
    tsg_canvas = $('#'+canvasID).get(0);
    tsg_cxt = tsg_canvas.getContext('2d');
   
    //prepare data set for max number of lines
    tsg_data = new Array(numLines);
    tsg_graphs = new Array();   //no initial size because <numLine> elements are pushed onto the empty array
    tsg_yaxes = new Array();    //no initial size ""

    //create first 'base' graph
    tsg_data[0] = new Array();
    tsg_createGraph(canvasID, [colors[0]], [0], numLines*75);

    //create graph for any additional lines
    for(var i=1; i<numLines; i++){
        tsg_data[i] = new Array(); 
        tsg_createOverlayGraph(canvasID, [colors[i]], [0], numLines*75);
    }

    //create Y-axis for each line
    for(var i=0; i<numLines; i++){
        tsg_createYAxis(canvasID, tsg_graphs[i], (numLines*75) - (numLines-i-1)*75);
    }

};

var tsg_createGraph = function(_id, _colors, _data, leftOffset){
    var lineGraph = new RGraph.Line({    //RGraph lib line object
        id: _id,
        data: _data,
        options: {
            Background: {
                color: 'rgba(0,0,0,0.2)',
                grid: {
                    autofit: {
                        numvlines: 10
                    },
                    color: 'black'
                }
            },
            colors: _colors,
            linewidth: 3,
            hmargin: 5,
            shadow: false,
            tickmarks: false,
            noaxes: true,
            ylabels: false,
            gutter: {
                left: leftOffset
            }
        }
    });

  tsg_graphs.push(lineGraph);
}

var tsg_createOverlayGraph = function(_id, _colors, _data, leftOffset){
    var lineGraph = new RGraph.Line({    //RGraph lib line object
        id: _id,
        data: _data,
        options: {
            Background: {
                grid: false
            },
            colors: _colors,
            linewidth: 3,
            hmargin: 5,
            shadow: false,
            tickmarks: false,
            noaxes: true,
            ylabels: false,
            gutter: {
                left: leftOffset
            }
        }
    });

  tsg_graphs.push(lineGraph);
};

var tsg_createYAxis = function(_id, _graph, leftOffset){
    yaxis = new RGraph.Drawing.YAxis({
        id: _id,
        x: leftOffset,
        options: {
            max: 1,
            title: 'title',
            text: { size: 8},
            colors: _graph.get('colors'),
            numLabels: 3,
            numticks: 3
        }
    });

    yaxis.set('scale.formatter', axisFormatter); //assign formatting function
    tsg_yaxes.push(yaxis);
};

var axisFormatter = function(obj, num){
    num = num.toString();
    if(num.length > 4){
        num = parseInt(num).toExponential(1);
    }

    return num;
};
