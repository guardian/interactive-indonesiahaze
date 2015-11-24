import domready from 'ded/domready'
import doT from 'olado/doT'
import mainTemplate from '../templates/main.html!text'
import bean from 'fat/bean'
// import bonzo from 'ded/bonzo'
// import reqwest from 'reqwest';
import debounce from './lib/debounce'
import d3 from 'd3'
import topojson from 'mbostock/topojson'
import strftime from 'samsonjs/strftime'
import Emitter from './emitter.js';
import CanvasVideoPlayer from './lib/canvas-video-player'
import graph from './graph.js';
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


    els.firesVideo.innerHTML = window.innerWidth > 700 ?
        '<source src="src/video/fires.mp4" type="video/mp4" />' :
        '<source src="src/video/fires-small.mp4" type="video/mp4"/>';

    els.sumatraVideo.innerHTML = window.innerWidth > 700 ?
        '<source src="src/video/sumatra.mp4" type="video/mp4" />' :
        '<source src="src/video/sumatra-small.mp4" type="video/mp4" />';




    function playBtnEvtHandler(evt) {
    }

    ([els.sumatraPlayBtn, els.firesPlayBtn, els.emissionsPlayBtn]).forEach(el => {
        let vid = document.querySelector(el.getAttribute('video'));
        el.addEventListener('click', evt => {
            el.setAttribute('firstplay', '');
            if (vid.paused) el.setAttribute('playing', '');
            else el.removeAttribute('playing');
            vid[vid.paused ? 'play' : 'pause']();
        });
        bean.on(el, 'click', '.idn-play-button__restart', evt => {
            console.log('adsf');
            vid.currentTime = 0;
            vid.play();
            evt.stopPropagation();
            evt.preventDefault();
        })
    });

    document.querySelector('.idn-fires__video').addEventListener('ended', evt => {
        els.firesPlayBtn.removeAttribute('playing');
    });

    (function () { // MAIN TIMELAPSE
        let lastDateStr;
        let startDate = new Date('2015/07/01'), endDate = new Date('2015/11/23'),
            timespan = endDate - startDate;
        let updateDate = () => {
            let newDate = startDate;
            if (!(isNaN(els.firesVideo.currentTime) || isNaN(els.firesVideo.duration))) {
                let progress = els.firesVideo.currentTime / els.firesVideo.duration;
                newDate = new Date((progress * timespan) + startDate.getTime());
            }
            let newDateStr = strftime('%B %e %Y', newDate);
            if (newDateStr !== lastDateStr) {
                els.firesDate.textContent = newDateStr;
                lastDateStr = newDateStr;
            }
        }
        updateDate();
        els.firesVideo.addEventListener('timeupdate', updateDate);
        els.firesVideo.addEventListener('play', updateDate);
    })();

    (function () { // SUMATRA TIMELAPSE
        let lastDateStr;
        let startDate = new Date('2015/09/01'), endDate = new Date('2015/11/23'),
            timespan = endDate - startDate;
        let updateDate = () => {
            let newDate = startDate;
            if (!(isNaN(els.sumatraVideo.currentTime) || isNaN(els.sumatraVideo.duration))) {
                let progress = els.sumatraVideo.currentTime / els.sumatraVideo.duration;
                newDate = new Date((progress * timespan) + startDate.getTime());
            }
            let newDateStr = strftime('%b %e %Y', newDate);
            if (newDateStr !== lastDateStr) {
                els.sumatraDate.textContent = newDateStr;
                lastDateStr = newDateStr;
            }
        }
        updateDate();
        els.sumatraVideo.addEventListener('timeupdate', updateDate);
        els.sumatraVideo.addEventListener('play', updateDate);
    })();

    (function () { // EMISSIONS VIDEO
        let lastDateStr;
        let startDate = new Date('2015/08/01'), endDate = new Date('2015/11/23'),
            timespan = endDate - startDate;
        let updateDate = () => {
            let newDate = startDate;
            if (!(isNaN(els.emissionsVideo.currentTime) || isNaN(els.emissionsVideo.duration))) {
                let progress = els.emissionsVideo.currentTime / els.emissionsVideo.duration;
                newDate = new Date((progress * timespan) + startDate.getTime());
            }
            let newDateStr = strftime('%b %e %Y', newDate);
            if (newDateStr !== lastDateStr) {
                els.emissionsDate.textContent = newDateStr;
                lastDateStr = newDateStr;
            }
        }
        updateDate();
        els.emissionsVideo.addEventListener('timeupdate', updateDate);
        els.emissionsVideo.addEventListener('play', updateDate);

        els.emissionsVideo.addEventListener('ended', evt => {
            els.emissionsPlayBtn.removeAttribute('playing');
        })
    })();

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
        if (window.self !== window.top) {
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
        } else {
            graphFns.animate();
        }
    }

    autoPlay();

    window.addEventListener('resize', debounce(evt => graphFns.resize(), 250))

}

domready(() => {
    window.setTimeout(() => {
        load();
        document.querySelector('.idn-content--loading').className = 'idn-content';
    }, 10);
    let resize = debounce(iframeMessenger.resize.bind(iframeMessenger), 200);
    window.addEventListener('resize', evt => resize());
    if (document.readyState !== 'complete') window.addEventListener('load', evt => resize());
    else resize();

    document.body.innerHTML = renderMainTemplate();

})
