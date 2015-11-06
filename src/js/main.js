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
import Emitter from './emitter.js';

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

class BurnCanvas {
    constructor(width, height, fires) {
        this.delay = 1000 * 60 * 60 * 24 * 5;
        this.sortedFires = fires.sort((a,b) => a.dateObj > b.dateObj ? 1 : b.dateObj > a.dateObj ? -1 : 0);
        this.width = width;
        this.height = height;
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'map__burns';
        this.canvas.width = width;
        this.canvas.height = height;
        this.context = this.canvas.getContext('2d');
        this.context.globalCompositeOperation = 'source-over';
        this.lastBurns = [];
    }

    setDate(date) {
        var burns = [];
        let d = date - this.delay;
        for (var i = 0; i < this.sortedFires.length; i++) {
            if (d < this.sortedFires[i].dateObj) break;
            burns.push(this.sortedFires[i]);
        }
        let newBurns = burns.length - this.lastBurns.length;
        if (newBurns > 0) {
            burns.slice(this.lastBurns.length).forEach(b => this.drawBurn(b))
        }
        this.lastBurns = burns;
    }

    drawBurn(burn) {
        this.context.globalAlpha = 0.1;
        this.context.beginPath();
        this.context.arc(burn.coords[0], burn.coords[1] , burn.radius*2, 0, 2*Math.PI);
        this.context.fillStyle = burn.burnGradient;
        this.context.fill();
    }
    redraw(width, height) {
        this.width = width || this.width;
        this.height = height || this.height;
        this.context.clearRect(0, 0, this.width, this.height);
        this.burns.forEach(f => this.drawBurn(f))
    }
}

class DayFrame {
    constructor(width, height, fires) {
        this.width = width;
        this.height = height;
        this.fires = fires;
        this.date = fires[0].dateObj;
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'map__burns';
        this.canvas.width = width;
        this.canvas.height = height;
        this.context = this.canvas.getContext('2d');
        this.context.globalCompositeOperation = 'color-burn';
        this.draw();
    }
    draw() {
        this.context.clearRect(0, 0, this.width, this.height);
        this.context.globalAlpha = 1.0;
        this.fires.forEach(f => {
            this.context.beginPath();
            this.context.arc(f.coords[0], f.coords[1] , f.radius*1.2, 0, 2*Math.PI);
            this.context.fillStyle = f.gradient;
            this.context.fill();
        })
    }
    getOpacity(renderDate) {
        let fadeIn = 1000 * 60 * 60 * 24;
        let fadeOut = 1000 * 60 * 60 * 24 * 5;
        let elapsed = renderDate - this.date;
        if (elapsed < 0) return 0;
        else if (elapsed < fadeIn) return elapsed / fadeIn;
        else return Math.max(0, 1 - ((elapsed - fadeIn) / fadeOut))
    }

}

class BigTimelapse extends Emitter {
    constructor(fires, width, height) {
        super()
        this.width = width;
        this.height = height;
        this.els = {
            svg: document.createElement('svg'),
            canvas: document.createElement('canvas')
        }
        this.svg = d3.select(this.els.svg)
            .attr({class: 'map', width: width, height: height}),

        this.canvas = d3.select(this.els.canvas)
            .attr({class: 'map__fires', width: width, height: height})

        this.context = this.canvas.node().getContext("2d");

        var projection = d3.geo.mercator()
            .center([107, 0])
            .scale(width*2.3)
            .translate([width / 2, height / 2]);

        var path = d3.geo.path().projection(this.projection);

        this.fires = this.processFires(fires, projection);

        this.burnCanvas = new BurnCanvas(width, height, this.fires.objects);
        this.fires.dayFrames = Object.keys(this.fires.byDate).map(d => {
            return new DayFrame(width, height, this.fires.byDate[d]);
        })
    }

    addToContainer(container) {
        container.appendChild(this.els.svg);
        container.appendChild(this.els.canvas);
        container.appendChild(this.burnCanvas.canvas);
    }

    processFires(features, projection) {
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
            .range([/*0.5, 1.5*/(this.width/900)*0.5, (this.width/900)*2.5])

        let fireObjects = displayFeatures
            .map(f => {
                let coords = projection(f.geometry.coordinates),
                    radius = fireRadius(f.properties.frp);
                let gradient = this.context.createRadialGradient(coords[0],coords[1], 0,coords[0], coords[1], radius/2)
                gradient.addColorStop(0,"red");
                gradient.addColorStop(1,"rgba(255 ,165, 0, 0.5)");
                let burnGradient = this.context.createRadialGradient(coords[0],coords[1], 0,coords[0], coords[1], radius*1.5)
                burnGradient.addColorStop(0,"rgba(180, 180, 180, 1)");
                burnGradient.addColorStop(1,"rgba(180, 180, 180, 0)");
                return {
                    date: f.properties.date,
                    dateObj: new Date(f.properties.date),
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

    play() {
        this.animationStartTime = new Date();
        let animationDuration = 20000;
        let animationTimePeriod = this.fires.endDate - this.fires.startDate;
        this.timeRatio = animationTimePeriod / animationDuration;
        this.frame();
    }

    frame() {
        let now = new Date();
        let elapsed = this.timeRatio * (now - this.animationStartTime);
        let currentTime = new Date(this.fires.startDate.getTime() + elapsed);

        let displayDate = strftime('%B %e %Y', currentTime);
        if (this.displayDate !== displayDate) {
            this.displayDate = displayDate;
            this.emit('datechange', displayDate);
        }

        this.context.clearRect(0, 0, this.width, this.height);
        this.context.globalCompositeOperation = 'color-burn';

        this.burnCanvas.setDate(currentTime);

        this.fires.dayFrames.forEach(dayFrame => {
            let opacity = dayFrame.getOpacity(currentTime);
            if (opacity > 0) {
                this.context.globalAlpha = opacity;
                this.context.drawImage(dayFrame.canvas, 0, 0);
            }
        });
        if (currentTime < this.fires.endDate) {
            window.requestAnimationFrame(this.frame.bind(this));
        }
    }
}

function loadData(idn) {
    var features = {};
    (['geo','palmoil','fiber','logging', 'fires']).forEach(key => {
        features[key] = topojson.feature(idn, idn.objects[key])
    })

    var center = d3.geo.centroid(features.geo);

    var container = d3.select("#map-container");

    var els = {
        mapContainer: document.querySelector("#map-container"),
        fireDate: document.querySelector('.fire-date')
    };

    var {width, height} = els.mapContainer.getBoundingClientRect();

    let bigTimelapse = new BigTimelapse(features.fires.features, width, height);
    bigTimelapse.addToContainer(els.mapContainer);
    bigTimelapse.play();
    bigTimelapse.on('datechange', dateStr => {
        els.fireDate.textContent = dateStr;
    })

}

domready(() => {
    document.body.innerHTML = renderMainTemplate();
    loadData(data);
})
