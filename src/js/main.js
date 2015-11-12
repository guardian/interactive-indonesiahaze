import domready from 'ded/domready'
import doT from 'olado/doT'
import mainTemplate from '../templates/main.html!text'
import bean from 'fat/bean'
// import bonzo from 'ded/bonzo'
import debounce from './lib/debounce'
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
        firesDate: document.querySelector('.idn-fires__date'),
        firesPlayBtn: document.querySelector('.idn-fires .idn-play-button--container'),
        firesVideo: document.querySelector('.idn-fires__video'),

        sumatraVideo: document.querySelector('.idn-sumatra__video'),
        sumatraDate: document.querySelector('.idn-sumatra__date'),
        sumatraFireDate: document.querySelector('.idn-fire-date--sumatra'),
        sumatraZoomMap: document.querySelector('.idn-sumatra-zoom__map'),
        sumatraPlayBtn: document.querySelector('.idn-sumatra .idn-play-button--container'),

        emissionsContainer: document.body.querySelector('.idn-co-emissions'),
        emissionsVideo: document.body.querySelector('.idn-co-emissions__video'),
        emissionsDate: document.body.querySelector('.idn-co-emissions__date'),
        emissionsPlayBtn: document.body.querySelector('.idn-co-emissions .idn-play-button--container'),

        co2eGraphContainer: document.body.querySelector('.idn-co2e-graph'),
    };

    els.firesPlayBtn.addEventListener('click', function(evt) {
        let selector = this.getAttribute('video');
        document.querySelector(selector).play();
        this.setAttribute('playing', '');
    })

    document.querySelector('.idn-fires__video').addEventListener('ended', evt => {
        els.firesPlayBtn.removeAttribute('playing');
    });

    (function () { // MAIN TIMELAPSE
        let lastDateStr;
        let startDate = new Date('2015/07/01'), endDate = new Date('2015/10/30'),
            timespan = endDate - startDate;
        let updateDate = () => {
            let progress = els.firesVideo.currentTime / els.firesVideo.duration;
            let newDate = new Date((progress * timespan) + startDate.getTime());
            let newDateStr = strftime('%B %e %Y', newDate);
            if (newDateStr !== lastDateStr) {
                els.firesDate.textContent = newDateStr;
                lastDateStr = newDateStr;
            }
        }
        els.firesVideo.addEventListener('timeupdate', updateDate);
        els.firesVideo.addEventListener('play', updateDate);
    })();

    (function () { // SUMATRA TIMELAPSE
        let lastDateStr;
        let startDate = new Date('2015/09/01'), endDate = new Date('2015/10/30'),
            timespan = endDate - startDate;
        let updateDate = () => {
            let progress = els.sumatraVideo.currentTime / els.sumatraVideo.duration;
            let newDate = new Date((progress * timespan) + startDate.getTime());
            let newDateStr = strftime('%B %e %Y', newDate);
            if (newDateStr !== lastDateStr) {
                els.sumatraDate.textContent = newDateStr;
                lastDateStr = newDateStr;
            }
        }
        els.sumatraVideo.addEventListener('timeupdate', updateDate);
        els.sumatraVideo.addEventListener('play', updateDate);
    })();

    (function () { // EMISSIONS VIDEO
        let lastDateStr;
        let startDate = new Date('2015/08/01'), endDate = new Date('2015/10/30'),
            timespan = endDate - startDate;
        let updateDate = () => {
            let progress = els.emissionsVideo.currentTime / els.emissionsVideo.duration;
            let newDate = new Date((progress * timespan) + startDate.getTime());
            let newDateStr = strftime('%B %e %Y', newDate);
            if (newDateStr !== lastDateStr) {
                els.emissionsDate.textContent = newDateStr;
                lastDateStr = newDateStr;
            }
        }
        els.emissionsVideo.addEventListener('timeupdate', updateDate);
        els.emissionsVideo.addEventListener('play', updateDate);


        els.emissionsPlayBtn.addEventListener('click', function(evt) {
            let selector = this.getAttribute('video');
            document.querySelector(selector).play();
            this.setAttribute('playing', '');
        })

        els.emissionsVideo.addEventListener('ended', evt => {
            els.emissionsPlayBtn.removeAttribute('playing');
        })
    })();


    els.sumatraPlayBtn.addEventListener('click', function(evt) {
        let selector = this.getAttribute('video');
        document.querySelector(selector).play();
        this.setAttribute('playing', '');
    })

    document.querySelector('.idn-sumatra__video').addEventListener('ended', evt => {
        els.sumatraPlayBtn.removeAttribute('playing');
    })

    // var canvasVideo = new CanvasVideoPlayer({
    //     videoSelector: '.idn-fires__video',
    //     canvasSelector: '.idn-fires__canvas',
    //     framesPerSecond: 20
    // });
    // canvasVideo.play()


    let graphFns = graph(document.body.querySelector('.idn-co2e-graph'));
    let graphAnimated = false;

    function autoPlay() {
        iframeMessenger.getPositionInformation((msg) => {
            let threshold = msg.innerHeight / 3.5;

            // let mapContainerTop = msg.iframeTop + els.mapContainer.getBoundingClientRect().top
            // let autoplayMap = mapContainerTop > 0 && mapContainerTop < threshold;

            // let sumatraTop = msg.iframeTop + els.sumatraZoomMap.getBoundingClientRect().top
            // let autoplaySumatra = sumatraTop > 0 && sumatraTop < threshold;

            // let emissionTop = msg.iframeTop + els.emissionsContainer.getBoundingClientRect().top
            // let autoplayEmissions = emissionTop > 0 && emissionTop < threshold;

            // bigTimelapse[autoplayMap ? 'play' : 'pause']();
            // sumatraTimelapse[autoplaySumatra ? 'play' : 'pause']();
            // canvasVideo[autoplayEmissions ? 'play' : 'pause']();

            if (!graphAnimated) {
                let graphTop = msg.iframeTop + els.co2eGraphContainer.getBoundingClientRect().top
                let playGraph = graphTop > 0 && graphTop < (msg.innerHeight * 0.8) ;
                if (playGraph) {
                    graphFns.animate();
                    graphAnimated = true;
                }
            }

            window.setTimeout(autoPlay, 200);
        })
    }

    autoPlay();

    window.addEventListener('resize', debounce(evt => graphFns.resize(), 250))

}

domready(() => {
    window.setTimeout(() => {
        load();
        document.querySelector('.idn-content--loading').className = 'idn-content';
    }, 10);
    iframeMessenger.enableAutoResize();

    document.body.innerHTML = renderMainTemplate();

})
