// Slider JavaScript
let height = 60;
let width = 800;
let margin = {top: 10, right:10, bottom:10, left:10};
let timeScale;
let minDate, maxDate;
let timeData, headlineText;
let ease = d3.easePolyInOut;

let animate = true; // Controller on whether to display the RESUME button
let numMonths = 198; // max number of months we'll have a headline for
let animationDuration=30000; // Time to complete one cycle of animation. Can be tuned for UX
let tScale = d3.scaleLinear().domain([0,width]).range([0,1]);

const renderTimeline = async() => {
    let data = await d3.json("data/headlines.json");
    data.forEach(function(d){
        d["date"] =new Date(d["date"])
    });
    // Filter headlines that are more current than the Kaggle data
    data = data.filter(d=> d.date < new Date("2017-01-01 00:00:00")); 
    timeData = data; 
    console.log(data);
    
    minDate = d3.min(data, d=>d.date);
    maxDate = d3.max(data, d=>d.date);
    //console.log(minDate + maxDate);

    // Scale to convert between rectangle ("slider") width and a Date
    timeScale = d3.scaleTime()
        .domain([minDate, maxDate])
        .range([0, width]);
    let timeAxis = d3.axisBottom(timeScale);

    // Creates (but hides) a "resume" button for controlling animations
    /*d3.select(".timeline").append("text")
        .text("Resume")
        .attr("class", "resume-btn")
        //.attr("transform", "translate(0, 5)")
        .on("click", resumeAnimation);  */
    d3.select(".resume-button")
        .style("visibility", "hidden")
        .on("click", resumeAnimation);

    // Setting up the slider area
    let sliderContainer = d3.select(".timeline").append("div").attr("class","sliderContainer");
    let sliderCanvas = sliderContainer.append("svg").attr("width", 800).attr("height", 40)
        .on("click", clickedBar);
    let barLayer = sliderCanvas.append("g");
    let timeAxisLayer = sliderCanvas.append("g")
        .attr("transform", `translate(0, 20)`)
        .call(timeAxis);
    
    // The timeline bar
    let bar = barLayer.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", timeScale(maxDate))
        .attr("height", 20)
        .attr("fill", "black")
        .attr("class", "timelineBar")
        .call(d3.drag()
            .on("start", dragstart)
            .on("end", dragend)
            .on("drag", dragging));

    // Displays the date and headline below the timeline
    let headlineText = d3.select(".timeline").append("div")
        .attr("class", "headlineText");

    // Begins animating the time progression
    animateBar(timeScale, maxDate, minDate);   
}
renderTimeline();

    /**
    Given a position on the screen, displays the headline of the latest event before the
    selected time. 
*/
function getNearestHeadline(x){
    let time = timeScale.invert(x);

    let candidates = timeData.filter(d=> d.date <= time); // Get all possible dates
    let nearestHeadline = candidates[candidates.length -1];

    let formatTime = d3.timeFormat("%B %Y");
    d3.select(".headlineText").html(
            `<b>${formatTime(nearestHeadline.date)}</b>: ${nearestHeadline.headline}`);
}

/**
    Once the "resume" button has been clicked, picks up animating where the user selected
*/
function resumeAnimation(){
    d3.select(".resume-button").style("visibility", "hidden");
    //animateBar(timeScale, maxDate, minDate);  
    let timeLeft = animationDuration*(1-d3.select(".timelineBar").attr("T"));

    //console.log(d3.select(".timelineBar").attr("T"));
    d3.select(".timelineBar")
            .transition()
                .duration(animationDuration)
                .attr("width", timeScale(maxDate))
                .ease(resume_eased(ease))
                .on("end", animateBar(timeScale, maxDate, minDate));      
    animate = true; 
 
}

/**
    Pauses the animation so that the user can manually interact with the timeline. 
*/
function pauseAnimation(){
    d3.select(".timelineBar").transition().duration(0); // Pause the animation
    //d3.select(".resume-btn").text("RESUME");
    d3.select(".resume-button").style("visibility", "visible");

    animate = false; // TODO: Use to show a resume button to keep the animation going
}

function dragstart(){
    if(animate){
        pauseAnimation();
    }
}
function dragging(d){
    d3.select(this).attr("width", d3.event.x);
    getNearestHeadline(d3.event.x);
    updateChart(timeScale.invert(d3.event.x).getFullYear());
    updateMap(timeScale.invert(d3.event.x).getFullYear());

}
function dragend(d){
    getNearestHeadline(d3.event.x);
    updateChart(timeScale.invert(d3.event.x).getFullYear());
    updateMap(timeScale.invert(d3.event.x).getFullYear());
    d3.select(".timelineBar").attr("T", tScale(d3.event.x)); // Used for resuming animation
}


function clickedBar(){
    console.log(d3.event.offsetX);
    if(animate){
        pauseAnimation();
    }

    d3.select(".timelineBar")
        .attr("width", d3.event.offsetX);

    getNearestHeadline(d3.event.offsetX);
    updateChart(timeScale.invert(d3.event.offsetX).getFullYear());
    updateMap(timeScale.invert(d3.event.offsetX).getFullYear());
    d3.select(".timelineBar").attr("T", tScale(d3.event.offsetX)); // Used for resuming animation
}


/**
    Helper function for the animateHeadlines function
*/
const waitFor = (ms) => new Promise(r => setTimeout(r, ms))
const asyncForEach = async(callback) => {
    while(true){
        await callback();
        }
}

/**
     Updates the headline based on the current position of the animated timeline. 
*/
const animateHeadlines = async () => {
    var array = new Array(numMonths); // A hack to make it easier to iterate through the headlines synchronously
    await asyncForEach(async () => {
        await waitFor(animationDuration/numMonths);
        //console.log(d3.select(".timeslineBar").attr("width"));
        getNearestHeadline(d3.select(".timelineBar").attr("width"));
        updateChart(timeScale.invert(d3.select(".timelineBar").attr("width")).getFullYear());
        updateMap(timeScale.invert(d3.select(".timelineBar").attr("width")).getFullYear());
    })
    console.log('Done');
}

/* 
    After resuming the animation, maintain the current path of easing 
    Ease: the easing function used for the bar
*/
function resume_eased(ease){
    let elapsed_time = d3.select(".timelineBar").attr("T");
    //console.log(elapsed_time);
    return function(t){
        var x_og = d3.scaleLinear().domain([0,1]).range([elapsed_time, 1])(t); // Take in the normalized T value
        //console.log(x_og);
        //console.log(ease(x_og));
        x_og = d3.scaleLinear().domain([ease(elapsed_time),1]).range([0,1])(ease(x_og));
        //console.log(x_og);
        return (x_og);
    }
}

/**
    Main controller when animation is running on its own. 
*/
function animateBar(timeScale, maxDate, minDate){
    repeat();
    function repeat(){
        if(animate){
            d3.select(".timelineBar")
            .attr("width", timeScale(minDate))
            .attr("T", 0)
            .transition()
                .ease(ease)
                .duration(animationDuration)
                .attr("width", timeScale(maxDate))
                .attr("T", 1)
                .on("start", animateHeadlines)
                .on("end", repeat); 
        }
    }
}



// Barchart JavaScript
let svgDecisions = d3.select("svg#decisions");
let svgWidth = svgDecisions.attr("width");
let svgHeight = svgDecisions.attr("height");

let padding = {top: 20, bottom: 30, left: 50, right: 50};
let chartWidth = svgWidth - padding.left - padding.right;
let chartHeight = svgHeight - padding.top - padding.bottom;

// Array to store relevant data
const syrianData = [];

let xScale = d3.scaleBand()  
    .domain(['Pending at Start', 'Applicants', 'Recognized', 'Closed', 'Rejected', 'Other', 'Pending at End'])             
    .rangeRound([0, chartWidth])
    .padding(0.3);

let yScale = d3.scalePow()
    .exponent(0.3)
    .domain([0,1000000])
    .range([chartHeight,0]);

const xAxis = d3.axisBottom(xScale);

svgDecisions.append("g")
    .attr("class", "x axis")
    .attr("transform","translate("+ padding.left +","+ (padding.top + chartHeight)+")")
    .call(xAxis);

const yAxis = d3.axisLeft(yScale)
    .tickFormat(d3.format("0.1s"));

svgDecisions.append("g")
    .attr("class", "y axis")
    .attr("transform","translate("+ (padding.left) +","+ padding.top +")")
    .call(yAxis);

let barSVG = svgDecisions.append("g")
    .attr("transform","translate("+ padding.left +","+ padding.top +")");

function updateChart(year){
    var numApplicants = 0;
    var numRecognized = 0;
    var numOther = 0;
    var numRejected = 0;
    var numClosed = 0;
    var numPendingStart = 0;
    var numPendingEnd = 0;

    syrianData.forEach( d => {
        if (d['Year'] == year){
            numApplicants += d['Applied during year'];
            numRecognized += d['decisions_recognized'];
            numOther += d['decisions_other'];
            numRejected += d['Rejected'];
            numClosed += d['Otherwise closed'];
            numPendingStart += d['Tota pending start-year'];
            numPendingEnd += d['Total pending end-year'];
        }
    });
    
    let barCategories = ['Pending at Start', 'Applicants', 'Recognized', 'Closed', 'Rejected', 'Other', 'Pending at End'];
    let barHeights = [numPendingStart, numApplicants, numRecognized, numClosed, numRejected, numOther, numPendingEnd];

    var barData = [];
    for(var i = 0; i < 7; i++){
        barData.push({"category": barCategories[i], "height": barHeights[i]})
    }

    var bars = barSVG.selectAll(".bar")
        .data(barData)

    bars.exit().remove();

    var newBars = bars.enter()
        .append("rect")       
        .attr("class", "bar")
        .attr("x", d => xScale(d.category))
        .attr("width", xScale.bandwidth())
        .attr("y", d => chartHeight)
        .attr("height", 0)
        .style("fill", "#e25d5d");
    
    newBars.merge(bars)
        .transition()
        .duration(animationDuration/numMonths)
        .attr("y", d => yScale(d.height))
        .attr("height", d => chartHeight - yScale(d.height));

    var heightText = barSVG.selectAll(".height")
        .data(barData)

    heightText.exit().remove();
    
    var newText = heightText.enter()
        .append("text")
        .attr("class", "height")
        .text("")
        .attr("text-anchor", "middle")
        .attr("x", d => xScale(d.category) + xScale.bandwidth() / 2)
        .attr("y", d => chartHeight)
        .attr("fill", "black")
        .attr("font-size", 14)

    newText.merge(heightText)
        .transition()
        .duration(animationDuration/numMonths)
        .text(d => d.height.toLocaleString())
        .attr("y", d => yScale(d.height) - 10)
    
}

function updateMap(year){
        routeGroup.selectAll(".cla").exit().remove()

        //route animation, comment call to remove the transition
        var routeAnimation = function routeAnimation(path) {
        path.transition()
            .duration(1000)
            .attrTween("stroke-dasharray", animationHelper)
            .on("end", function(d,i) { 
            });
        };
        var animationHelper = function animationHelper() {
        var len = this.getTotalLength(),
            interpolate = d3.interpolateString("0," + len, len + "," + len);

        return function(t) { return interpolate(t); };
        };

        //adding routes into map, starting at syria and country centroid
        routes = [];
        for(var i=0, len=filteredCountries.length-1; i<len; i++){
            if(filteredCountries[i][0] == year){
                routes.push({
                type: "LineString",
                coordinates: [
                    [ 38.996815,34.802074 ],
                    [ filteredCountries[i][2], filteredCountries[i][3] ]
                ]
            });
            }
        }
        var routePaths = routeGroup.selectAll(".cla")
            .data(routes);
        
        //remove prexisting routes
        routePaths.exit().remove();

        var newRoutePaths = routePaths.enter()
            .append("path")
            .attr('class', 'cla')
            .attr("d", path)
            .style("fill", "none")
            .style("stroke", "rgb(226, 93, 93)")
            .style("stroke-width", "1.25px")
            .call(routeAnimation); 

        //merge animation
        newRoutePaths.merge(routePaths)
    }

//Map Javascript

//create var to store routes before
var projection = d3.geoEquirectangular()
    .scale(1)
    .translate([0, 0]);    

var path = d3.geoPath()
    .projection(projection);

var svg = d3.select("#mercator")

svg.style("background-color", "black")
    .style("height", "450")
    .style("width", "960")
    .style("display", "block")
    .style("margin", "auto")
    //.style("margin-top", "5%")
    .style("margin-bottom", "10px");

var mapSVG = svg.append("svg")
var g = svg.append("g");
var routeGroup = g.append('g'); 

var mapHeight = svg.attr("height");
var mapWidth = svg.attr("width");


filteredCountries = []

const requestData = async () => {

    d3.select("#existing").text(function() {
        return "Hover over a country to see pre-existing refugees in the area"
    })
    .style("font-size", "12px")
    // .style("display", "block")
    .style("text-align", "center");

    const asylumSeekers = await d3.csv('data/asylum_seekers.csv', d3.autoType);
    
    // Cleanup data, create new array for Syrian Refugee Crisis 
    //const syrianData = []
    asylumSeekers.forEach( d => {
        d['destination'] = d['Country / territory of asylum/residence'];

        var relevantKeys = ['Applied during year', 'decisions_recognized', 'decisions_other', 'Rejected',
            'Otherwise closed', 'Tota pending start-year', 'Total pending end-year']

        for(var i = 0; i < relevantKeys.length; i++){
            if (d[relevantKeys[i]] == null || d[relevantKeys[i]] == '*'){
                d[relevantKeys[i]] = 0;
            };
        }

        if (d['Origin'] == "Syrian Arab Rep."){
            syrianData.push(d);
        }
    });

    //Map requesting data
    const data = await d3.json('data/countries.geo.json');

    const idCountry = await d3.csv('data/idCountry.csv');

    var world = data.features;
    
    //mapping geofeature symbol to csv symbols
    idCountry.forEach(function(i) {
        world.forEach(function(j) {
            if (i.id === j.id) {
                j.name = i.name
                j.id = i.population
            }
        })
    })

    var bounds = path.bounds(data);
    
    var scaleMax = Math.max(((bounds[1][0] - bounds[0][0]) / mapWidth), ((bounds[1][1] - bounds[0][1]) / mapHeight));
    scale = (.95) / scaleMax;
    
    //mapping translation of how to map height and bounds in terms of x and y coordinates
    translationX = (mapWidth - scale * (bounds[1][0] + bounds[0][0]));
    translationY = (mapHeight - scale * (bounds[1][1] + bounds[0][1]));
    translation = [translationX / 2, translationY / 2];

    projection.scale(scale)
        .translate(translation);

    mapSVG.selectAll("path")
        .data(world).enter()
        .append("path")
        .style("fill", "white")
        .style("stroke", "black")
        .style("stroke-width", "1px")
        .attr("d", path)
        .on("mouseover", function(d, error) {
            d3.select(this)
                .transition().duration(300)
                .style("fill", "rgb(226, 93, 93)");
            console.log(d.name, d.id)
            d3.select("#existing").text(function() {
                var refugee;
                if(d.id == "VLOW"){
                    refugee = "Very Low (less than 1,000)"
                }
                else if (d.id == "LOW"){
                    refugee = "Low (less than 10,000)"
                }
                else if (d.id == "MED"){
                    refugee = "Medium (more than 10,000)"
                }
                else if (d.id == "HIGH"){
                    refugee = "High (more than 25,000)"
                }
                else if (d.id == "VHIGH"){
                    refugee = "Very High (more than 50,000)"
                }
                else{
                    refugee = "Very Low (less than 1,000)"
                }
                if (d.name == null){
                    d.name = "South Sudan"
                }
                return d.name + "'s" + " percentage of pre-existing refugees: " + refugee;
            })
            .style("font-size", "12px")
            // .style("display", "block")
            .style("text-align", "center");

        })
        .on("mouseout", function(d, error) {
            d3.select("#existing").text(function() {
                return "Hover over a country to see pre-existing refugees in the area"
            })
            .style("font-size", "12px")
            // .style("display", "block")
            .style("text-align", "center");
            d3.select(this)
                .transition().duration(300)
                .style("fill", "white")
        });

    function reporter(x) {
        console.log(x)
        console.log(x.name)
    }

    var psv = asylumSeekers.filter(function(row) {
        return row['Origin'] == "Syrian Arab Rep."        
    })



    psv.forEach(function(e, j) {
        idCountry.forEach(function(d, i) {
            if(e["Country / territory of asylum/residence"] == d.name){
                var c = []
                var year = e["Year"]
                c.push(parseInt(year));
                c.push(e)
                c.push(parseFloat(d.longitude));
                c.push(parseFloat(d.latitude));
                filteredCountries.push(c);
            }
        })
    })
};

requestData();
