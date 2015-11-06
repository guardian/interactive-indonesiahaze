import domready from 'ded/domready'
import doT from 'olado/doT'
import mainTemplate from '../templates/main.html!text'
// import bean from 'fat/bean'
// import bonzo from 'ded/bonzo'
import d3 from 'd3'
import topojson from 'mbostock/topojson'
import strftime from 'samsonjs/strftime'
import data from '../../data/out/indonesia.topojson!json'
import Emitter from './emitter.js';

var renderMainTemplate = doT.template(mainTemplate);

function groupBy(arr, fn) {
    var obj = {};
    for (var i = 0; i < arr.length; i++) {
        let key = fn(arr[i]);
        obj[key] = obj[key] || [];
        obj[key].push(arr[i])
    }
    return obj;
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
        let fadeIn = 1000 * 60 * 60 * 24 * 1.5;
        let fadeOut = 1000 * 60 * 60 * 24 * 5;
        let elapsed = renderDate - this.date;
        if (elapsed < 0) return 0;
        else if (elapsed < fadeIn) return elapsed / fadeIn;
        else return Math.max(0, 1 - ((elapsed - fadeIn) / fadeOut))
    }

}

class Timelapse extends Emitter {
    constructor({projection, fires, width, height, geo, radiusMultiplier, concessions}) {
        super()
        this.width = width;
        this.height = height;
        this.radiusMultiplier = radiusMultiplier || 1;
        this.els = {
            // svg: document.createElement('svg'),
            canvas: document.createElement('canvas')
        }

        this.canvas = d3.select(this.els.canvas)
            .attr({class: 'map__fires', width: width, height: height})

        this.context = this.canvas.node().getContext("2d");

        this.fires = this.processFires(fires, projection);

        this.burnCanvas = new BurnCanvas(width, height, this.fires.objects);
        this.fires.dayFrames = Object.keys(this.fires.byDate).sort().map(d => {
            return new DayFrame(width, height, this.fires.byDate[d]);
        })

        this.geo = geo;
        this.concessions = concessions;
        this.projection = projection;
    }

    addToContainer(container) {
        container.appendChild(this.els.canvas);
        container.appendChild(this.burnCanvas.canvas);

        if (this.geo) {
            this.svg = d3.select(container)
                .append('svg')
                .attr({class: 'map', width: this.width, height: this.height});
            var path = d3.geo.path().projection(this.projection);
            this.svg.append("path")
                .datum(this.geo)
                .attr('class', 'map__country')
                .attr("d", path);

            if (this.concessions) {
                this.svg.append("path")
                    .datum(this.concessions)
                    .attr('class', 'map__concessions')
                    .attr("d", path);

            }
        }
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
            .range([/*0.5, 1.5*/(this.width/900)*0.5*this.radiusMultiplier, (this.width/900)*2.5*this.radiusMultiplier])

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
            byDate: groupBy(fireObjects, d => d.date)
        }
    }

    play(startDate, endDate, duration) {
        this.animationStartTime = new Date();
        this.startDate = startDate;
        this.endDate = endDate;
        let animationTimePeriod = endDate - startDate;
        this.timeRatio = animationTimePeriod / duration;
        this.frame();
    }

    renderAt(currentTime) {
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
    }

    frame() {
        let now = new Date();
        let elapsed = this.timeRatio * (now - this.animationStartTime);
        let currentTime = new Date(this.startDate.getTime() + elapsed);

        this.renderAt(currentTime);

        if (currentTime < this.endDate) {
            window.requestAnimationFrame(this.frame.bind(this));
        }
    }
}


function loadData(idn) {
    var features = {};
    (['geo','palmoil','fiber','logging', 'fires']).forEach(key => {
        features[key] = topojson.feature(idn, idn.objects[key])
    })

    var container = d3.select("#map-container");

    var els = {
        mapContainer: document.querySelector("#map-container"),
        fireDate: document.querySelector('.fire-date'),
        sumatraFireDate: document.querySelector('.fire-date--sumatra'),
        sumatraZoomMap: document.querySelector('.sumatra-zoom__map')
    };

    var {width, height} = els.mapContainer.getBoundingClientRect();


    var bigTimelapseProjection = d3.geo.mercator()
        .center([107, 0])
        .scale(width*2.3)
        .translate([width / 2, height / 2]);

    let bigTimelapse = new Timelapse({
        projection: bigTimelapseProjection,
        fires:features.fires.features,
        width: width, height: height
    });
    bigTimelapse.addToContainer(els.mapContainer);
    // bigTimelapse.play(new Date('2015/07/01'), new Date('2015/10/30'), 20000);
    bigTimelapse.on('datechange', dateStr => {
        els.fireDate.textContent = dateStr;
    })
    bigTimelapse.renderAt(new Date('2015/07/01'));

    let autoPlayBigTimelapse = evt => {
        let {top} = els.mapContainer.getBoundingClientRect();
        let threshold = window.innerHeight / 3.5;
        if (top < threshold && top > 0) {
            bigTimelapse.play(new Date('2015/07/01'), new Date('2015/10/30'), 20000);
            window.removeEventListener('scroll', autoPlayBigTimelapse);
        }
    }
    window.addEventListener('scroll', autoPlayBigTimelapse)





    let {width:sumatraWidth, height:sumatraHeight} = els.sumatraZoomMap.getBoundingClientRect();
    var sumatraTimelapseProjection = d3.geo.mercator()
        .center([105.55, -3]) //-2.739543, 105.554825
        .scale(width*15)
        .translate([sumatraWidth / 2, sumatraHeight / 2]);
    let sumatraTimelapse = new Timelapse({
        projection: sumatraTimelapseProjection,
        fires: features.fires.features,
        width: sumatraWidth,
        height: sumatraHeight,
        geo: features.geo,
        radiusMultiplier: 4.5,
        concessions: features.fiber
    });

    sumatraTimelapse.addToContainer(els.sumatraZoomMap);
    sumatraTimelapse.on('datechange', dateStr => {
        els.sumatraFireDate.textContent = dateStr;
    })
    sumatraTimelapse.renderAt(new Date('2015/09/01'));


    let autoPlaySumatraTimelapse = evt => {
        let {top} = els.sumatraZoomMap.getBoundingClientRect();
        let threshold = window.innerHeight / 3.5;
        if (top < threshold && top > 0) {
            sumatraTimelapse.play(new Date('2015/09/01'), new Date('2015/10/30'), 12000);
            window.removeEventListener('scroll', autoPlaySumatraTimelapse);
        }
    }
    window.addEventListener('scroll', autoPlaySumatraTimelapse)
}

domready(() => {
    document.body.querySelector('.content-container').innerHTML = renderMainTemplate();
    loadData(data);
})
