// Dimensions of sunburst.
var width = 1000;
var height = 500;
var radius = Math.min((2*width/3), height) / 2;

// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
var b = {
  w: 200, h: 30, s: 3, t: 10
};

var json2;
var nodes;
var selec;

// Total size of all segments; we set this later, after loading the data.
var totalSize = 0; 


var seed = 1;
function random() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

colors = {};
legend_colors = [];

function getRandomColor(d) {
    if (!colors[d.name]) {
	    var letters = '0123456789ABCDEF'.split('');
    	var color = '#';
    	for (var i = 0; i < 6; i++ ) {
        	color += letters[Math.floor(random() * 16)];
	    }
	    colors[d.name] = color;
	    legend_colors.push({key: d.name, value:color});
	} else {
		color = colors[d.name];
	}
    d.color = color
	return color;
}

function toTitleCase(str){
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

function create_idnum(str){
    return str.replace(/[^A-Za-z]/g,"").toLowerCase();
}



var partition = d3.layout.partition()
    .size([2 * Math.PI, radius * radius])
    .value(function(d) { return d.size; });

var arc = d3.svg.arc()
    .startAngle(function(d) { return d.x; })
    .endAngle(function(d) { return d.x + d.dx; })
    .innerRadius(function(d) { return Math.sqrt(d.y); })
    .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });


var vis = d3.select("#chart").append("svg:svg")
    .attr("width", 2*width/3)
    .attr("height", height)
    .append("svg:g")
    .attr("id", "container")
    .attr("transform", "translate(" + (2*width/3) / 2 + "," + height / 2 + ")");




var visa = d3.select("#chart1").append("svg:svg")
    .attr("width", 2*width/3)
    .attr("height", height)
    .append("svg:g")
    .attr("id", "container")
    .attr("transform", "translate(" + (2*width/3) / 2 + "," + height / 2 + ")");


d3.json("results.json", function(err,data) {
    createVisualization(data, vis);
    createVisualization(data, visa);    
    mouseover(nodes[12]);
});



// Main function to draw and set up the visualization, once we have the data.
function createVisualization(json, svgin) {

    initializeBreadcrumbTrail();
    svgin.append("svg:circle")
        .attr("r", radius)
        .style("opacity", 0);

    // For efficiency, filter nodes to keep only those large enough to see.
    nodes = partition.nodes(json)
        .filter(function(d) {
            return (d.dx > 0.0005); // 0.005 radians = 0.29 degrees
        });


    var path = svgin.data([json]).selectAll("path")
        .data(nodes)
        .enter().append("svg:path")
        .attr("display", function(d) { return d.depth ? null : "none"; })
        .attr("d", arc)
        .attr("fill-rule", "evenodd")
        .style("fill", getRandomColor)
        .style("opacity", 1)
        .on("mouseover", mouseover);

    // Add the mouseleave handler to the bounding circle.
    d3.select("#container").on("mouseleave", mouseleave);
    totalSize = path.node().__data__.value;
};


// Fade all but the current sequence, and show it in the breadcrumb trail.
function mouseover(d) {

    var percentage = (100 * d.value / totalSize).toPrecision(4);
    var percentageString = percentage + "%";
    if (percentage < 0.01) {
        percentageString = "< 0.01%";
    }

    d3.select("#percentage")
      .text(percentageString);

    d3.select("#explanation")
      .style("visibility", "");

    var sequenceArray = getAncestors(d);
    updateBreadcrumbs(sequenceArray, percentageString);

    // Fade all the segments.
    vis.selectAll("path")
      .style("opacity", 0.3);

    // Then highlight only those that are an ancestor of the current segment.
    vis.selectAll("path")
      .filter(function(node) {
                return (sequenceArray.indexOf(node) >= 0);
              })
      .style("opacity", 2);
    
    // all maps to original colors
    d3.selectAll(".classdistrict").style("visibility", "hidden");
    d3.selectAll(".classregion").style("fill", function(d){return color(d.properties.inscrits)});

    if (d.depth >=2){
        if (d.depth === 4){
            var iddist = create_district1(d.parent.parent.name);
        }
        if (d.depth === 3){
            var iddist = create_district1(d.parent.name);
        }
        if (d.depth === 2) {
            var iddist = create_district1(d.name);
        }
        d3.selectAll(".classdistrict").filter("#"+iddist)
            .style("opacity", 2)
            .style("visibility", "visible")
            .attr("stroke", "#a9a9a9");
        
    } else{
        idnum = create_idnum(d.name);    
        d3.select("path[id="+idnum+"]")
            .style("fill", "blue")
            .style("opacity", 2)
            .attr("stroke", "#a9a9a9");
    }  
}

// Restore everything to full opacity when moving off the visualization.
function mouseleave(d) {

    d3.select("#trail")
        .style("visibility", "hidden");

    // Deactivate all segments during transition.
    vis.selectAll("path").on("mouseover", null);

    // Transition each segment to full opacity and then reactivate it.
    d3.select("#container")  
        .selectAll("path")
        .transition()
        .duration(100)
        .style("opacity", 1)
        .each("end", function() {
              d3.select(this).on("mouseover", mouseover);
            });

    d3.select("#explanation")
        .style("visibility", "hidden");

    d3.selectAll(".classdistrict").style("visibility", "hidden");
    d3.selectAll(".classregion").style("fill", function(d){return color(d.properties.inscrits)});

    mouseover(nodes[12]);

}

// Given a node in a partition layout, return an array of all of its ancestor
// nodes, highest first, but excluding the root.
function getAncestors(node) {
    var path = [];
    var current = node;
    while (current.parent) {
        path.unshift(current);
        current = current.parent;
    }
    return path;
}

function initializeBreadcrumbTrail() {
    // Add the svg area.
    var trail = d3.select("#sequence").append("svg:svg")
        .attr("width", width)
        .attr("height", 50)
        .attr("id", "trail");
    // Add the label at the end, for the percentage.
    trail.append("svg:text")
        .attr("id", "endlabel")
        .style("fill", "#000");
}

// Generate a string that describes the points of a breadcrumb polygon.
function breadcrumbPoints(d, i) {
    var points = [];
    points.push("0,0");
    points.push(b.w + ",0");
    points.push(b.w + b.t + "," + (b.h / 2));
    points.push(b.w + "," + b.h);
    points.push("0," + b.h);
    if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
        points.push(b.t + "," + (b.h / 2));
    }
    return points.join(" ");
}

// Update the breadcrumb trail to show the current sequence and percentage.
function updateBreadcrumbs(nodeArray, percentageString) {

  // Data join; key function combines name and depth (= position in sequence).
  
  var g = d3.select("#trail")
      .selectAll("g")
      .data(nodeArray, function(d) {return d.name + d.depth; });

  // Add breadcrumb and label for entering nodes.
  var entering = g.enter().append("svg:g");

  entering.append("svg:polygon")
      .attr("points", breadcrumbPoints)
      .style("fill", function(d) { return d.color;});

  entering.append("svg:text")
    .attr("x", (b.w + b.t) / 2)
	.attr("color", function(d) { return d.color; } )
    .attr("y", b.h / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .text(function(d) { return d.name; });

  // Set position for entering and updating nodes.
  g.attr("transform", function(d, i) {
    return "translate(" + i * (b.w + b.s) + ", 0)";
  });

  // Remove exiting nodes.
  g.exit().remove();

  // Now move and update the percentage at the end.
  d3.select("#trail").select("#endlabel")
      .attr("x", (nodeArray.length + 0.5) * (b.w + b.s))
      .attr("y", b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(percentageString);

  // Make the breadcrumb trail visible, if it's hidden.
  d3.select("#trail")
      .style("visibility", "");

}


var w = 300;
var h = 500;

var color = d3.scale.linear()
             .domain([95859,1577740])
             .range(['beige', 'red']);

//Define map projection
var projection = d3.geo.mercator()
                       .translate([0, 0])
                       .scale([1]);

var projection1 = d3.geo.mercator()
                       .translate([0, 0])
                       .scale([1]);

//Define path generator
var path1 = d3.geo.path().projection(projection);
var path2 = d3.geo.path().projection(projection1);
                

//Create SVG element
var vis1 = d3.select("#vis")
            .append("svg")
            .attr("width", w)
            .attr("height", h)
            .attr("id", "container1");
            //.attr("transform", "translate(" + (w) / 2 + "," + h / 2 + ")");

var region = vis1.append("svg:g");


var district = vis1.append("svg:g")
               .style("visibility", "hidden")
               .style("fill","blue");


//Create SVG element
var vis2 = d3.select("#vis1")
            .append("svg")
            .attr("width", w)
            .attr("height", h)
            .attr("id", "container1");
            //.attr("transform", "translate(" + (w) / 2 + "," + h / 2 + ")");

var region1 = vis2.append("svg:g");


var district1 = vis2.append("svg:g")
               .style("visibility", "hidden")
               .style("fill","blue");


// Load in my states data!
d3.csv("out_inscrits.csv", function(data){
    d3.json("madagascar_region1.json", function(json1) {
        create_maps(data, json1, region);                    
    });
});

d3.json("madagascar_district1.json", function(json2) {            
    create_maps1(json2, district);     
});

            
function create_maps(data, json1, svgin){
    // Loop through each state data value in the .csv file
    for (var i = 0; i < data.length; i++) {

        // Grab State Name
        var dataState = create_idnum(data[i].idname);

        // Grab data value 
        var dataValue = data[i].Inscrits;
        
        // Find the corresponding state inside the GeoJSON
        for (var j = 0; j < json1.features.length; j++)  {
            var jsonState = create_idnum(json1.features[j].properties.REGION);
            if (dataState === jsonState) {
                json1.features[j].properties.inscrits = dataValue; 
                break;
            }
        }
    }
            
    var b1 = path1.bounds(json1),
    s = 0.95/ Math.max((b1[1][0] - b1[0][0])/ w, (b1[1][1] - b1[0][1]) / h),
    t = [(w - s * (b1[1][0] + b1[0][0]))/ 2, (h - s * (b1[1][1] + b1[0][1])) / 2];
      
    projection
      .scale(s)
      .translate(t);
    
    svgin.selectAll("path")
       .data(json1.features)
       .enter().append("path")
       .attr("d", path1)
       .attr("id", function(d){return create_idnum(d.properties.REGION)})
       .attr("class", "classregion")
       //.attr("class", "classregion")
       .style("fill", function(d) {return color(d.properties.inscrits)})
       .attr("stroke", "#a9a9a9")
       .on('mouseover', mouseover1);

     d3.select("#container1").on("mouseleave", mouseout1);

}            
            

function create_maps1(json2, svgin){
    var b2 = path2.bounds(json2),
    s1 = 0.95/ Math.max((b2[1][0] - b2[0][0])/ w, (b2[1][1] - b2[0][1]) / h),
    t1 = [(w - s1 * (b2[1][0] + b2[0][0]))/ 2, (h - s1 * (b2[1][1] + b2[0][1])) / 2];
      
    projection1
      .scale(s1)
      .translate(t1);

    svgin.selectAll("path")
       .data(json2.features)
       .enter().append("path")
       .attr("d", path2)
       .attr("id", create_district)
       .attr("class", "classdistrict")
       // .attr("class", "classdistrict")
       .attr("stroke", "#a9a9a9")
       .style("visibility","hidden");
}         



function create_district(d){
    var iddist = create_idnum(d.properties.DISTRICT);
    // console.log(iddist);
    if (['antananarivoi', 'antananarivoii', 'antananarivoiii', 'antananarivoiv', 'antananarivov', 'antananarivovi'].indexOf(iddist) > -1){
        return "distantananarivorenivohitra";
    } else {
        return "dist"+iddist;    
    }
}

function create_district1(d){
    var iddist = create_idnum(d);
    iddist.replace('sud','atsimo');
    iddist.replace('nord','avaratra');
    if (['antananarivoi', 'antananarivoii', 'antananarivoiii', 'antananarivoiv', 'antananarivov', 'antananarivovi'].indexOf(iddist) > -1){
        return "distantananarivorenivohitra";
    }
    if (iddist === 'belohaandroy'){
        return "distbeloha";
    } 
    if (iddist === 'manakara'){
        return "distmanakaraatsimo";
    }
    if (iddist === 'toliaryii'){
        return "disttoliaraii";
    }
    if (iddist === 'portberge'){
        return "distportbergeborizinyvaovao";
    } 
    if (iddist === 'amboasary'){
        return "distportbergeborizinyvaovao";
    } 
    if (iddist === 'ankazoabosud'){
        return "distankazoabo";
    }    
    else {
        return "dist"+iddist;    
    }
}



function mouseover1(d){
  // Fade all the segments.

  region.selectAll("path").style("opacity", 0.8)
    .style("fill", function(d){return color(d.properties.inscrits)});

  d3.select(this).style('fill', 'blue').style("opacity", 2.0);
  
  for (var i = 0; i < nodes.length; i++) {
    if (create_idnum(nodes[i].name) == create_idnum(d.properties.REGION)){
        mouseover(nodes[i]);
        return
    }
  }
}

function mouseout1(d){
  region.selectAll("path").on("mouseover", null);
  // Transition each segment to full opacity and then reactivate it.
  d3.select("#container1")  
      .selectAll("path")
      .transition()
      .duration(100)
      .style("opacity", 1)
      .each("end", function() {
              d3.select(this).on("mouseover", mouseover1);
            });
    
  for (var i = 0; i < nodes.length; i++) {
    if (create_idnum(nodes[i].name) ===  create_idnum(d.properties.REGION)){
        mouseleave(nodes[i]);
        return
    }
  }
}

d3.selectAll("#vis1").append("#vis");

// });



