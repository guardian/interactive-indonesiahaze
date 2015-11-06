import domready from 'ded/domready'
import template from '../templates/co.html!text'

domready(() => {
    document.body.innerHTML = template;
});
