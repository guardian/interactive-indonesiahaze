import domready from 'ded/domready'
import CanvasVideoPlayer from './lib/canvas-video-player'

console.log(CanvasVideoPlayer);

domready(() => {
    var el = document.body.querySelector('co-emissions');
    var canvasVideo = new CanvasVideoPlayer({
        'videoSelector': 'video',
        'canvasSelector': 'canvas',
        'framesPerSecond': 10
    });

    canvasVideo.play();
});
