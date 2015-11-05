import domready from 'ded/domready'
import bean from 'fat/bean'
import bonzo from 'ded/bonzo'
import d3 from 'd3'
import topojson from 'mbostock/topojson'
import queue from 'mbostock/queue'
import reqwest from 'reqwest'
import strftime from 'samsonjs/strftime'
import data from '../../data/out/indonesia.topojson!json'

const minConfidence = 50;
const co2PerFire = 14015.70;

const margin = {top: 20, right: 100, bottom: 30, left: 60},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

const countries = [
    {
        'name': 'United Kingdom',
        'emissions': 100000000
    }
];

Date.prototype.addDays = function(days) {
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() + days);
    return dat;
}

function groupBy(arr, fn) {
    var obj = {};
    for (var i = 0; i < arr.length; i++) {
        let key = fn(arr[i]);
        obj[key] = obj[key] || [];
        obj[key].push(arr[i])
    }
    return obj;
}

domready(() => {
    loadData(data)
});

function loadData(idn) {
    var fireFeatures = topojson.feature(idn, idn.objects.fires).features
        .filter(f => f.properties.confidence > minConfidence);


    var dates = fireFeatures.map(f => new Date(f.properties.date));
    var startDate = new Date(Math.min.apply(null, dates)),
        endDate = new Date(Math.max.apply(null, dates));

    var fires = groupBy(fireFeatures, f => f.properties.date);

    var dateCO2e = [];
    var cumulativeCO2e = 0;
    for (let date = startDate; date <= endDate; date = date.addDays(1)) {
        let dateKey = strftime('%Y/%m/%d', date);
        cumulativeCO2e += fires[dateKey].length * co2PerFire;
        dateCO2e.push({date, 'emissions': cumulativeCO2e});
    }

    var totalCO2e = dateCO2e.reduce((total, co2e) => total + co2e.emissions, 0);

    var x = d3.time.scale().range([0, width]);
    var y = d3.scale.linear().range([height, 0]);
    var xAxis = d3.svg.axis().scale(x).orient('bottom');
    var yAxis = d3.svg.axis().scale(y).orient('left').tickFormat(d3.format('s'));

    var line = d3.svg.line().x(d => x(d.date)).y(d => y(d.emissions));

    var svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain(d3.extent(dateCO2e, d => d.date));
    y.domain([0, d3.max(dateCO2e, d => d.emissions)]);

    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    svg.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    countries.forEach(country => {
        var countryY = y(country.emissions);
        svg.append('line').attr({
            'class': 'preset',
            'x1': 0,      'y1': countryY,
            'x2': width,  'y2': countryY
        });
        svg.append('text').attr({
            'class': 'country',
            'x': width, 'y': countryY, 'dy': '0.3em', 'dx': '0.2em'
        }).text(country.name);
    });

    var path = svg.append('path')
        .datum(dateCO2e)
        .attr('class', 'line')
        .attr('d', line);
}
