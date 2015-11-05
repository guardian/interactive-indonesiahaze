import domready from 'ded/domready'
import doT from 'olado/doT'
import mainTemplate from '../templates/main.html!text'
import bean from 'fat/bean'
import bonzo from 'ded/bonzo'
import d3 from 'd3'
import topojson from 'mbostock/topojson'
import queue from 'mbostock/queue'
import reqwest from 'reqwest'
import strftime from 'samsonjs/strftime'
import data from '../../data/out/indonesia.topojson!json'

var renderMainTemplate = doT.template(mainTemplate);

function fetchJson(url, callback) {
    reqwest({ url: url, type: 'json', contentType: 'application/json' })
        .then(json => callback(null, json))
        .catch(err => callback(err))
}

function groupBy(arr, fn) {
    var obj = {};
    for (var i = 0; i < arr.length; i++) {
        let key = fn(arr[i]);
        obj[key] = obj[key] || [];
        obj[key].push(arr[i])
    }
    return obj;
}

function partition(arr, fn) {
    var results = [[],[]];
    arr.forEach(v => results[fn(v) ? 0 : 1].push(v))
    return results;
}

Date.prototype.addDays = function(days) {
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() + days);
    return dat;
}

domready(() => {
    document.body.innerHTML = renderMainTemplate();
    loadData(data);
})


class BurnCanvas {
    constructor(width, height) {
        this.burns = [];
        this.width = width;
        this.height = height;
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'map__burns';
        this.canvas.width = width;
        this.canvas.height = height;
        this.context = this.canvas.getContext('2d');
        this.context.globalCompositeOperation = 'source-over';
    }

    drawBurn(burn) {
        this.context.globalAlpha = 0.1;
        this.context.beginPath();
        this.context.arc(burn.coords[0], burn.coords[1] , burn.radius*2, 0, 2*Math.PI);
        this.context.fillStyle = burn.burnGradient;
        this.context.fill();
    }
    addBurns(burns) {
        burns.forEach(b => this.drawBurn(b))
        this.burns = this.burns.concat(burns);
    }
    redraw(width, height) {
        this.width = width || this.width;
        this.height = height || this.height;
        this.context.clearRect(0, 0, this.width, this.height);
        this.burns.forEach(f => this.drawBurn(f))
    }
}

function loadData(idn) {

    var features = {};
    (['geo','palmoil','fiber','logging', 'fires']).forEach(key => {
        features[key] = topojson.feature(idn, idn.objects[key])
    })
    var center = d3.geo.centroid(features.geo);

    var width = 1200, height = 600;

    var container = d3.select("#map-container");

    var els = {
        mapContainer: document.querySelector("#map-container"),
        fireDate: document.querySelector('.fire-date'),
        cumulativeFires: document.querySelector('.cumulative-fires'),
        activeFires: document.querySelector('.active-fires'),
        svg: container.append("svg")
                .attr({class: 'map', width: width, height: height}),
        canvas: container.append("canvas")
                .attr({class: 'map__fires', width: width, height: height}),
        burnCanvas: new BurnCanvas(width, height)
    }
    els.mapContainer.appendChild(els.burnCanvas.canvas)

    els.context = els.canvas.node().getContext("2d");

    var projection = d3.geo.mercator()
        .center([107, 0])
        .scale(width*2.3)
        .translate([width / 2, height / 2]);

    var path = d3.geo.path().projection(projection);

    els.svg.append("path")
        .datum(features.geo)
        .attr('class', 'map__country')
        .attr("d", path);

    // els.svg.append("path")
    //     .datum(features.palmoil)
    //     .attr('class', 'map__palm')
    //     .attr("d", path);

    // els.svg.append("path")
    //     .datum(features.fiber)
    //     .attr('class', 'map__fiber')
    //     .attr("d", path);

    // els.svg.append("path")
    //     .datum(features.logging)
    //     .attr('class', 'map__logging')
    //     .attr("d", path);

    var groups = {
        fires: els.svg.append('g').attr('class', 'fires')
    };


    function processFires(features) {
        let minConfidence = 50;

        var displayFeatures = features
            .filter(d => d.properties.confidence > minConfidence)

        console.log(displayFeatures.length, 'fires');

        // date bounds
        var dates = displayFeatures.map(f => new Date(f.properties.date));
        var startDate = new Date('2015/07/01'),
            endDate = new Date(Math.max.apply(null, dates));
        var freezeDate = strftime('%Y/%m/%d', endDate.addDays(-7));

        // frp bounds
        let frps = displayFeatures.map(d => d.properties.frp);
        let frp = {
            min: Math.min.apply(null, frps),
            max: Math.max.apply(null, frps)
        }

        // color scales
        let fireColor = d3.scale.pow().exponent(1)
            .domain([minConfidence, 100])
            .range(['yellow', 'red'])
        let fireRadius = d3.scale.pow().exponent(0.5)
            .domain([frp.min, frp.max])
            .range([/*0.5, 1.5*/(width/1600)*0.5, (width/1600)*2.5])

        let fireObjects = displayFeatures
            .map(f => {
                let coords = projection(f.geometry.coordinates),
                    radius = fireRadius(f.properties.frp);
                let gradient = els.context.createRadialGradient(coords[0],coords[1], 0,coords[0], coords[1], radius/2)
                gradient.addColorStop(0,"red");
                gradient.addColorStop(1,"rgba(255 ,165, 0, 0.5)");
                let burnGradient = els.context.createRadialGradient(coords[0],coords[1], 0,coords[0], coords[1], radius*1.5)
                burnGradient.addColorStop(0,"rgba(180, 180, 180, 1)");
                burnGradient.addColorStop(1,"rgba(180, 180, 180, 0)");
                return {
                    date: f.properties.date,
                    freeze: new Date(f.properties.date) >= endDate,
                    coords: coords,
                    color: d3.rgb(fireColor(f.properties.confidence)),
                    radius: radius,
                    gradient: gradient,
                    burnGradient: burnGradient
                }
            });

        return {
            objects: fireObjects,
            byDate: groupBy(fireObjects, d => d.date),
            startDate: startDate,
            endDate: endDate
        }
    }

    var fires = processFires(features.fires.features);

    var activeFires = [],
        burnedFires = [];
    var totalFires = 0;

    function fireOpacity(fire, currentTime) {
        let aliveTime = currentTime - fire.added;
        if (aliveTime < 200) {
            return aliveTime / 200
        } else if (fire.freeze) {
            return 1;
        } else if (aliveTime < 1000) {
            let x = (aliveTime - 200);
            return 1 - (x / 800);
        } else return 0.2;
    }

    var canvasDrawTimeout;

    function canvasFrame() {
        els.context.clearRect(0, 0, width, height);
        let now = new Date();

        els.context.globalCompositeOperation = 'color-burn';
        activeFires.forEach(f => {
            els.context.beginPath();
            els.context.globalAlpha = fireOpacity(f, now);
            els.context.arc(f.coords[0], f.coords[1] , f.radius*1.2, 0, 2*Math.PI);
            els.context.fillStyle = f.gradient;
            els.context.fill();
        })
        canvasDrawTimeout = window.requestAnimationFrame(canvasFrame);
    }

    let tickDuration = 150,
        date;

    function fireTimer() {
        let oldDate = date;
        date = date ? date.addDays(1) : fires.startDate;
        let now = new Date();
        let isBurning = f => now - f.added < 1000;

        [activeFires, newlyBurnedFires] = partition(activeFires, isBurning)
        els.burnCanvas.addBurns(newlyBurnedFires);
        if (date <= fires.endDate) {
            window.setTimeout(fireTimer, tickDuration)
            let dateKey = strftime('%Y/%m/%d', date);
            els.fireDate.textContent = strftime('%B %e %Y', date);
            let newFires = fires.byDate[dateKey];
            newFires.forEach(f => f.added = now)
            totalFires += newFires.length;
            activeFires = activeFires.concat(newFires);
        } else {
            // activeFires = activeFires
            //     .filter(f => f.freeze || now - f.added < 1000)
            // if (activeFires.filter(f => f.freeze).length === activeFires.length) {
            if (activeFires.filter(isBurning).length === 0) {
                console.log('CLEAR');
                window.cancelAnimationFrame(canvasDrawTimeout);
            } else {
                window.setTimeout(fireTimer, tickDuration)
            }
        }

        els.cumulativeFires.textContent = `${totalFires} total fires`;
        els.activeFires.textContent = `${activeFires.length} active fires`;
    }

    fireTimer();
    canvasFrame();
}
