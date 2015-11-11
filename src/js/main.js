import domready from 'ded/domready'
import doT from 'olado/doT'
import mainTemplate from '../templates/main.html!text'
import bean from 'fat/bean'
// import bonzo from 'ded/bonzo'
import d3 from 'd3'
import topojson from 'mbostock/topojson'
import strftime from 'samsonjs/strftime'
import Emitter from './emitter.js';
import CanvasVideoPlayer from './lib/canvas-video-player'
import graph from './graph.js';
import reqwest from 'reqwest';
import iframeMessenger from 'guardian/iframe-messenger';

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

function load(features) {

    var container = d3.select("#map-container");

    var els = {
        firesContainer: document.querySelector(".idn-fires"),
        fireDate: document.querySelector('.idn-fires__date'),
        sumatraFireDate: document.querySelector('.idn-fire-date--sumatra'),
        sumatraZoomMap: document.querySelector('.idn-sumatra-zoom__map'),
        emissionsContainer: document.body.querySelector('.idn-co-emissions')
    };

    // var canvasVideo = new CanvasVideoPlayer({
    //     videoSelector: '.idn-fires__video',
    //     canvasSelector: '.idn-fires__canvas',
    //     framesPerSecond: 20
    // });
    // canvasVideo.play()


    // var {width, height} = els.mapContainer.getBoundingClientRect();

    // bigTimelapse.on('datechange', dateStr => {
    //     els.fireDate.textContent = dateStr;
    // })


    // let {width:sumatraWidth, height:sumatraHeight} = els.sumatraZoomMap.getBoundingClientRect();
    // var sumatraTimelapseProjection = d3.geo.mercator()
    //     .center([105.55, -3]) //-2.739543, 105.554825
    //     .scale(sumatraWidth*40)
    //     .translate([sumatraWidth / 2, sumatraHeight / 2]);
    // let sumatraTimelapse = new Timelapse({
    //     projection: sumatraTimelapseProjection,
    //     fires: features.filteredfires.features,
    //     width: sumatraWidth,
    //     height: sumatraHeight,
    //     // geo: features.geo,
    //     // concessions: {
    //     //     type: "FeatureCollection",
    //     //     features: [].concat(features.fiber.features)
    //     // },
    //     radiusMultiplier: 4.5,
    //     startDate: new Date('2015/09/01'), endDate: new Date('2015/10/30'),
    //     duration: 12000
    // });

    // sumatraTimelapse.addToContainer(els.sumatraZoomMap);
    // sumatraTimelapse.on('datechange', dateStr => {
    //     els.sumatraFireDate.textContent = dateStr;
    // })
    // sumatraTimelapse.renderAt(new Date('2015/09/01'));



    // var graphContainer = document.body.querySelector('.idn-co-emissions');
    // var canvasVideo = new CanvasVideoPlayer({
    //     videoSelector: '.idn-co-emissions__video',
    //     canvasSelector: '.idn-co-emissions__canvas',
    //     framesPerSecond: 10
    // });

    // function autoPlay() {
    //     iframeMessenger.getPositionInformation((msg) => {
    //         let threshold = msg.innerHeight / 3.5;

    //         let mapContainerTop = msg.iframeTop + els.mapContainer.getBoundingClientRect().top
    //         let autoplayMap = mapContainerTop > 0 && mapContainerTop < threshold;

    //         let sumatraTop = msg.iframeTop + els.sumatraZoomMap.getBoundingClientRect().top
    //         let autoplaySumatra = sumatraTop > 0 && sumatraTop < threshold;

    //         let emissionTop = msg.iframeTop + els.emissionsContainer.getBoundingClientRect().top
    //         let autoplayEmissions = emissionTop > 0 && emissionTop < threshold;

    //         bigTimelapse[autoplayMap ? 'play' : 'pause']();
    //         sumatraTimelapse[autoplaySumatra ? 'play' : 'pause']();
    //         canvasVideo[autoplayEmissions ? 'play' : 'pause']();

    //         window.setTimeout(autoPlay, 200);
    //     })
    // }

    // autoPlay();
}

domready(() => {
    window.setTimeout(() => {
        load();
        // graph(document.body.querySelector('.idn-co2e-graph'), features.filteredfires.features);
        document.querySelector('.idn-content--loading').className = 'idn-content';
    }, 10);
    iframeMessenger.enableAutoResize();

    document.body.innerHTML = renderMainTemplate();

})
