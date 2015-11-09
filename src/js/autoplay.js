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

export default function({el, n, on, off}) {
    var isOn = false;
    let onscroll = evt => {
        let {top} = el.getBoundingClientRect();
        let threshold = window.innerHeight / n;
        let shouldBeOn = top < threshold && top > 0;
        if (on && !isOn && shouldBeOn) {
            on();
            // window.removeEventListener('scroll', throttledonscroll);
        } else if (off && isOn && !shouldBeOn) {
          off();
        }
        isOn = shouldBeOn;
    }
    var throttledonscroll = throttle(onscroll, 100);

    window.addEventListener('scroll', throttledonscroll);

}