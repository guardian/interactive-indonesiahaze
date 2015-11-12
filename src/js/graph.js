import domready from 'ded/domready'
import d3 from 'd3'
import topojson from 'mbostock/topojson'
import strftime from 'samsonjs/strftime'
import emissionsData from '../../data/out/emissions.json!json';

const countries = [
   {
       'name': 'United Kingdom',
       'emissions': 553.43 * 1000000
   },
   {
       'name': 'Canada',
       'emissions': 714.12 * 1000000
   },
   {
       'name': 'Russia',
       'emissions': 2322.22 * 1000000
   },
   {
       'name': 'Germany',
       'emissions': 887.22 * 1000000
   },
   {
       'name': 'Japan',
       'emissions': 1344.58 * 1000000
   },
   {
       'name': 'Brazil',
       'emissions': 1012.55 * 1000000
   }
];

Date.prototype.addDays = function(days) {
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() + days);
    return dat;
}

function load(el) {

    let rect = el.getBoundingClientRect();
    const margin = {top: 0, right: 20, bottom: 30, left: 60},
        width = rect.width - margin.left - margin.right,
        height = rect.height - margin.top - margin.bottom;


    var cumulativeCO2e = 0;
    let allCumulativeData = emissionsData.map(d => {
        return {
            date: new Date(d.date),
            emissions: cumulativeCO2e = d.emissions + cumulativeCO2e
        };
    })

    let cumulativeData = allCumulativeData.filter(d => d.date >= new Date('2015/05/01'));

    console.log(cumulativeData);

    var x = d3.time.scale().range([0, width]);
    var y = d3.scale.linear().range([height, 0]);
    var xAxis = d3.svg.axis().scale(x).orient('bottom').ticks(4);
    var yAxis = d3.svg.axis().scale(y).orient('left').tickFormat(d3.format('s'));

    var line = d3.svg.line().x(d => x(d.date)).y(d => y(d.emissions));

    var svg = d3.select(el).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain(d3.extent(cumulativeData, d => d.date)).nice();
    y.domain([0, d3.max(cumulativeData, d => d.emissions) * 1.35]);

    svg.append('g')
        .attr('class', 'idn-x idn-axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    svg.append('g')
        .attr('class', 'idn-y idn-axis')
        .call(yAxis);

    var countryLines = countries
        .sort((a, b) => a.emissions - b.emissions)
        .map(country => {
            var countryY = y(country.emissions);
            var g = svg.append('g');
            g.append('line').attr({
                'class': 'idn-preset__line',
                'x1': 0,      'y1': countryY,
                'x2': width,  'y2': countryY
            });
            g.append('text').attr({
                'class': 'idn-preset__country',
                'x': width, 'y': countryY, 'dy': '0.3em', 'dx': '0.2em'
            }).text(country.name);
            return {country, g};
        });

    svg.append("text")
        .attr("class", "idn-y idn-label")
        .attr("text-anchor", "end")
        .attr("y", 0)
        .attr("dx", -height/3)
        .attr("dy", "1.4em")
        .attr("transform", "rotate(-90)")
        .text("CO2e emissions (metric tons)");

    var path = svg.append('path')
        .datum([])
        // .datum(cumulativeData)
        .attr('class', 'idn-line')
        .attr('d', line);

    var visibleDateCO2e = [];
    function updatePath(date) {
        var co2e = cumulativeData[date];
        if (countryLines.length > 0 && co2e.emissions > countryLines[0].country.emissions) {
            countryLines[0].g.classed('idn-preset--above', true);
            countryLines.shift();
        }
        visibleDateCO2e.push(co2e);
        path.datum(visibleDateCO2e).attr('d', line);
        if (date < cumulativeData.length - 1) {
            window.requestAnimationFrame(updatePath.bind(null, date + 1));
        }
    }
    setTimeout(updatePath.bind(null, 0), 1000);
}

// domready(() => {
//     load(document.body, data)
// });

export default load;
