import fs from 'fs';
import path from 'path';
import Canvas from 'canvas';
import topojson from 'topojson';
import d3 from 'd3';
import child_process from 'child_process';

let Image = Canvas.Image;

let framesDir = path.resolve(__dirname, '../../data/frames')

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

function writePNG(canvas, fn, ncolors) {
    fs.writeFileSync(fn, canvas.toBuffer());
    // child_process.execFileSync('pngquant', ['-f', '-o', fn, ncolors, 'out.png']);
}

class BurnCanvas {
    constructor(width, height, fires) {
        this.delay = 1000 * 60 * 60 * 24 * 5;
        this.sortedFires = fires.sort((a,b) => a.dateObj > b.dateObj ? 1 : b.dateObj > a.dateObj ? -1 : 0);
        this.width = width;
        this.height = height;
        this.canvas = new Canvas();
        this.canvas.className = 'idn-map__burns';
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
        // this.context.globalAlpha = 0.1;
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
        this.canvas = new Canvas(width, height);
        this.canvas.className = 'idn-map__burns';
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

class Timelapse {
    constructor({projection, fires, width, height, geo, bgUrl, radiusMultiplier, concessions, startDate, endDate, duration, fps}) {
        console.log(`Timelapse: ${width}x${height}`)
        this.width = width;
        this.height = height;
        this.radiusMultiplier = radiusMultiplier || 1;
        this.els = {
            fireCanvas: new Canvas(width, height),
            outCanvas: new Canvas(width, height),
            bgCanvas: new Canvas(width, height)
        }

        this.contexts = {
            bg: this.els.bgCanvas.getContext('2d'),
            fire: this.els.fireCanvas.getContext('2d'),
            out: this.els.outCanvas.getContext('2d')
        }

        this.canvas = d3.select(this.els.canvas)
            .attr({class: 'idn-map__fires', width: width, height: height})

        this.fires = this.processFires(fires, projection);

        this.burnCanvas = new BurnCanvas(width, height, this.fires.objects);
        this.fires.dayFrames = Object.keys(this.fires.byDate).sort().map(d => {
            return new DayFrame(width, height, this.fires.byDate[d]);
        })

        this.geo = geo;
        this.concessions = concessions;
        this.projection = projection;

        this.startDate = startDate;
        this.endDate = endDate;

        this.bgUrl = bgUrl;
        if (bgUrl) {
            let bg = fs.readFileSync(bgUrl)
            let img = new Image;
            img.src = bg;
            this.contexts.bg.drawImage(img, 0, 0, img.width, img.height, 0, 0, this.els.bgCanvas.width, this.els.bgCanvas.height);
        }

        let animationTimePeriod = endDate - startDate;
        // this.timeRatio = animationTimePeriod / duration;
        this.totalFrames = Math.round((duration / 1000) * fps);
        this.frameTime = animationTimePeriod / this.totalFrames;
    }

    go() {
        for (var i = 0; i < this.totalFrames; i++) {
            let elapsed = this.frameTime * i;
            let renderDate = new Date(this.startDate.getTime() + elapsed);
            this.renderAt(renderDate);
            this.saveFrame(path.join(framesDir, `timelapse-frame-${i}.png`));
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
                let gradient = this.contexts.fire.createRadialGradient(coords[0],coords[1], 0,coords[0], coords[1], radius/2)
                gradient.addColorStop(0,"red");
                gradient.addColorStop(1,"rgba(255 ,165, 0, 0.5)");
                let burnGradient = this.contexts.fire.createRadialGradient(coords[0],coords[1], 0,coords[0], coords[1], radius*1.5)
                burnGradient.addColorStop(0,"rgba(20, 20, 20, 0.05)");
                burnGradient.addColorStop(1,"rgba(20, 20, 20, 0)");
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

    play(fromStart) {
        if (!this.playing && (fromStart || !this.finished)) {
            this.animationStartTime = new Date();
            this.animateFrom = fromStart ? this.startDate : this.pauseDate || this.startDate;
            this.frame();
        }
    }

    pause() {
        if (this.playing) {
            window.cancelAnimationFrame(this.animationFrame);
            this.pauseDate = this.getCurrentTime();
            this.playing = false;
        }
    }

    getCurrentTime() {
        let now = new Date();
        let elapsed = this.timeRatio * (now - this.animationStartTime);
        return new Date(this.animateFrom.getTime() + elapsed);
    }

    renderAt(currentTime) {
        // let displayDate =    ('%B %e %Y', currentTime);
        // if (this.displayDate !== displayDate) {
        //     this.displayDate = displayDate;
        // }

        this.contexts.fire.clearRect(0, 0, this.width, this.height);
        this.contexts.fire.globalCompositeOperation = 'color-burn';

        this.burnCanvas.setDate(currentTime);

        this.fires.dayFrames.forEach(dayFrame => {
            let opacity = dayFrame.getOpacity(currentTime);
            if (opacity > 0) {
                this.contexts.fire.globalAlpha = opacity;
                this.contexts.fire.drawImage(dayFrame.canvas, 0, 0);
            }
        });
        this.contexts.out.globalAlpha = 1.0;
        this.contexts.out.globalCompositeOperation = 'source-over';
        this.contexts.out.drawImage(this.els.bgCanvas, 0, 0)
        this.contexts.out.drawImage(this.burnCanvas.canvas, 0, 0)
        this.contexts.out.drawImage(this.els.fireCanvas, 0, 0)
    }

    saveFrame(fn) {
        console.log(`Saving frame ${fn}`)
        writePNG(this.els.outCanvas, fn, 16);
    }
}


function main() {
    let data = JSON.parse( fs.readFileSync(path.join(__dirname, '../../data/out/indonesia.topojson')) );

    var features = {};
    (['filteredfires'/*, 'palmoil','fiber','logging'*/]).forEach(key => {
        features[key] = topojson.feature(data, data.objects[key])
    })

    function mainTimelapse() {
        let width = 1260;
        let height = 600;

        var bigTimelapseProjection = d3.geo.mercator()
            .center([107, 0])
            .scale(width*2.3)
            .translate([width / 2, height / 2]);

        let bigTimelapse = new Timelapse({
            projection: bigTimelapseProjection,
            fires:features.filteredfires.features,
            width: width, height: height,
            startDate: new Date('2015/07/01'), endDate: new Date('2015/10/30'),
            duration: 20000, fps: 20, bgUrl: __dirname + '/../img/indonesia-bg.png'
        });

        bigTimelapse.go();
    }

    function sumatraTimelapse() {
        let sumatraWidth = 620, sumatraHeight = 500;
        var sumatraTimelapseProjection = d3.geo.mercator()
            .center([105.2, -3.1]) //-2.739543, 105.554825
            .scale(sumatraWidth*28)
            .translate([sumatraWidth / 2, sumatraHeight / 2]);
        let sumatraTimelapse = new Timelapse({
            projection: sumatraTimelapseProjection,
            fires: features.filteredfires.features,
            width: sumatraWidth, height: sumatraHeight,
            // geo: features.geo,
            // concessions: {
            //     type: "FeatureCollection",
            //     features: [].concat(features.fiber.features)
            // },
            radiusMultiplier: 4.5,
            bgUrl: __dirname  + '/../img/sumatra-satellite.png',
            startDate: new Date('2015/09/01'), endDate: new Date('2015/10/30'),
            duration: 10000, fps: 20
        });
        sumatraTimelapse.go();
    }

    // mainTimelapse();
    sumatraTimelapse();
}


main();
