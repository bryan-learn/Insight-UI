Array.prototype.max = function () {
  return Math.max.apply(Math, this);
};

Array.prototype.min = function () {
  return Math.min.apply(Math, this);
};

var tsg_data = new Array();
var tsg_canvas = null;
var tsg_cxt = null;
var tsg_ymin = 0;
var tsg_yman = 0;

var tsg_draw = function() { //Time Sequence Graph handle
    tsg_cxt.clearRect( 0,0,tsg_canvas.width,tsg_canvas.height );  //Clear canvas before redrawing

    var line = new RGraph.Line({    //RGraph lib line object
        id: 'tsg-cvs',
        data: tsg_data,
        options: {
            Background: {
                color: 'black',
                grid: {
                    autofit: {
                        numvlines: 10
                    },
                    color: 'white'
                }
            },
            colors: ['yellow', 'green'],
            linewidth: 3,
            hmargin: 5,
            shadow: false,
            tickmarks: false,
            //ymin: tsg_ymin,
            //ymax: tsg_ymax,
            //labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            gutter: {
                left: 100
            }
        }
    }).draw();
};

var tsg_setData = function(dataArray){
  tsg_data = dataArray;
}

var tsg_add_datapoint = function(cwnd, ssthresh){
  if(tsg_data[0].length > 12){
    tsg_data[0].shift();
    tsg_data[1].shift();

  }
  tsg_data[0].push(cwnd);
  tsg_data[1].push(ssthresh);

  //tsg_ymin = Math.min(tsg_data[0].min(), tsg_data[1].min());
  //tsg_ymax = Math.max(tsg_data[0].max(), tsg_data[1].max());
};

var tsg_init = function(canvas){
  tsg_canvas = canvas;
  tsg_cxt = tsg_canvas.getContext('2d');
  tsg_data[0] = new Array(); //cwnd
  tsg_data[1] = new Array(); //ssthresh
};


