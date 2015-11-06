function throttle(fn, threshhold, scope) {
  threshhold || (threshhold = 250);
  var last,
      deferTimer;
  return function () {
    var context = scope || this;

    var now = +new Date,
        args = arguments;
    if (last && now < last + threshhold) {
      // hold on to it
      clearTimeout(deferTimer);
      deferTimer = setTimeout(function () {
        last = now;
        fn.apply(context, args);
      }, threshhold);
    } else {
      last = now;
      fn.apply(context, args);
    }
  };
}

export default function(el, x, fn) {
    let onscroll = evt => {
        let {top} = el.getBoundingClientRect();
        let threshold = window.innerHeight / x;
        if (top < threshold && top > 0) {
            fn();
            window.removeEventListener('scroll', throttledonscroll);
        }
    }
    var throttledonscroll = throttle(onscroll, 100);

    window.addEventListener('scroll', throttledonscroll);

}