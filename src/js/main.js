import domready from 'ded/domready'
import doT from 'olado/doT'
import mainTemplate from '../templates/main.html!text'
import bean from 'fat/bean'
import bonzo from 'ded/bonzo'
// import reqwest from 'reqwest'
import bowser from 'ded/bowser'
import debounce from './lib/debounce'
import throttle from './lib/throttle'
import d3 from 'd3'
import topojson from 'mbostock/topojson'
import strftime from 'samsonjs/strftime'
import Emitter from './emitter.js';
import CanvasVideoPlayer from './lib/canvas-video-player'
import graph from './graph.js';

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

let breakdownData = [
    {type: 'Palm oil', color: '#EBC1CB', land: 7.92, fires: 12.64},
    {type: 'Pulpwood', color: '#C97D8A', land: 6.15, fires: 18.73},
    {type: 'Logging', color: '#964F5D', land: 14.44, fires: 5.54},
    {type: 'Moratorium', color: '#bdbdbd', land: 33.40, fires: 30.00},
    {type: 'Other', color: '#bdbdbd', land: 38.09, fires: 33.0}
];

let processedBreakdownData = breakdownData
    .map(d => {
        d.max = Math.max(d.land, d.fires);
        d.landWidth = d.land > d.fires ? 100 : (d.land / d.fires) * 100;
        d.firesWidth = d.fires > d.land ? 100 : (d.fires / d.land) * 100;
        return d;
    })

function load(el, config) {

    var container = d3.select("#map-container");

    var els = {
        contentEl: el.querySelector('.idn-content'),

        firesContainer: el.querySelector(".idn-fires"),
        firesDate: el.querySelector('.idn-fires__date'),
        firesPlayBtn: el.querySelector('.idn-fires .idn-play-button--container'),
        firesVideo: el.querySelector('.idn-fires__video'),

        sumatraVideo: el.querySelector('.idn-sumatra__video'),
        sumatraDate: el.querySelector('.idn-sumatra__date'),
        sumatraFireDate: el.querySelector('.idn-fire-date--sumatra'),
        sumatraZoomMap: el.querySelector('.idn-sumatra-zoom__map'),
        sumatraPlayBtn: el.querySelector('.idn-sumatra .idn-play-button--container'),

        emissionsContainer: el.querySelector('.idn-co-emissions'),
        emissionsVideo: el.querySelector('.idn-co-emissions__video'),
        emissionsDate: el.querySelector('.idn-co-emissions__date'),
        emissionsPlayBtn: el.querySelector('.idn-co-emissions .idn-play-button--container'),

        co2eGraphContainer: el.querySelector('.idn-co2e-graph'),
    };

    els.firesVideo.innerHTML = window.innerWidth > 700 ?
        `<source src="${config.assetPath}/src/video/fires.mp4" type="video/mp4" />` :
        `<source src="${config.assetPath}/src/video/fires-small.mp4" type="video/mp4"/>`;

    els.sumatraVideo.innerHTML = window.innerWidth > 700 ?
        `<source src="${config.assetPath}/src/video/sumatra.mp4" type="video/mp4" />` :
        `<source src="${config.assetPath}/src/video/sumatra-small.mp4" type="video/mp4" />`;

    // let playFns = {};
    // playFns[els.firesPlayBtn] = () =>

    let useCanvasVideo = bowser.ios;
    if (useCanvasVideo) bonzo(els.contentEl).addClass('idn-content--canvasvideo');

    function playBtnEvtHandler(evt) {
    }

    function setupVideo(containerSelector, fps) {

        let btnEl = el.querySelector(containerSelector + ' .idn-play-button--container');
        let vid = el.querySelector(containerSelector + ' video');
        let canvasVideo = useCanvasVideo && new CanvasVideoPlayer({
            videoSelector: containerSelector + ' video',
            canvasSelector: containerSelector + ' canvas',
            framesPerSecond: 20
        });

        let play = () => {
            useCanvasVideo ? canvasVideo.play() : vid.play();
            btnEl.setAttribute('playing', '');
        }
        let pause = () => {
            useCanvasVideo ? canvasVideo.pause() : vid.pause();
            btnEl.removeAttribute('playing');
        }
        let isPaused = () => useCanvasVideo ? !canvasVideo.playing : vid.paused;

        btnEl.addEventListener('click', evt => {
            btnEl.setAttribute('firstplay', '');
            if (isPaused()) play();
            else pause();
        });
        bean.on(btnEl, 'click', '.idn-play-button__restart', evt => {
            vid.currentTime = 0;
            play();
            evt.stopPropagation();
            evt.preventDefault();
        })
    }

    setupVideo('.idn-fires', 20);
    setupVideo('.idn-sumatra', 20);
    setupVideo('.idn-co-emissions', 10);

    el.querySelector('.idn-fires__video').addEventListener('ended', evt => {
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
            let newDateStr = strftime('%e %B %Y', newDate);
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
            let newDateStr = strftime('%e %B %Y', newDate);
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
            let newDateStr = strftime('%e %B %Y', newDate);
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

    el.querySelector('.idn-sumatra__video').addEventListener('ended', evt => {
        els.sumatraPlayBtn.removeAttribute('playing');
    })

    let graphFns = graph(el.querySelector('.idn-co2e-graph'));

    if (bowser.mobile) {
        graphFns.go();
    } else {
        let autoPlay = throttle(function() {
            let threshold = window.innerHeight / 3.5;
            let graphTop = els.co2eGraphContainer.getBoundingClientRect().top
            let playGraph = graphTop > 0 && graphTop < (window.innerHeight * 0.8) ;
            if (playGraph) {
                graphFns.animate();
                window.removeEventListener('scroll', autoPlay);
            }
        }, 250)

        window.addEventListener('scroll', autoPlay);
        window.addEventListener('resize', debounce(evt => graphFns.resize(), 250))
    }


}

export function init(el, context, config, mediator) {
    domready(() => {
        window.setTimeout(() => {
            load(el, config);
            bonzo(el.querySelector('.idn-content--loading')).removeClass('idn-content--loading');
        }, 10);

        el.innerHTML = renderMainTemplate({breakdown: processedBreakdownData, config: config});
    })
}
