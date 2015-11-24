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
       'emissions': 714.12 * 1000000,
       'hideAtSmallSize': true
   },/*
   {
       'name': 'Russia',
       'emissions': 2322.22 * 1000000
   },*/
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
       'emissions': 1012.55 * 1000000,
       'hideAtSmallSize': true
   }
];

Date.prototype.addDays = function(days) {
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() + days);
    return dat;
}

function load(el) {

    const margin = {top: 0, right: 0, bottom: 30, left: 50}


    var cumulativeCO2e = 0;
    let allCumulativeData = emissionsData.map(d => {
        return {
            date: new Date(d.date),
            emissions: cumulativeCO2e = d.emissions + cumulativeCO2e
        };
    })

    let cumulativeData = allCumulativeData.filter(d => d.date >= new Date('2015/05/01'));

    var svg = d3.select(el).insert("svg", ':first-child')
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x = d3.time.scale();
    var y = d3.scale.linear()
    var xAxis = d3.svg.axis().scale(x).orient('bottom');
    var yAxis = d3.svg.axis().scale(y).orient('left').tickFormat(d3.format('s'));

    var line = d3.svg.line().x(d => x(d.date)).y(d => y(d.emissions));

    x.domain(d3.extent(cumulativeData, d => d.date));
    y.domain([0, d3.max(cumulativeData, d => d.emissions) * 1.10]);

    let xaxis = svg.append('g')
        .attr('class', 'idn-x idn-axis');

    let yaxis = svg.append('g')
        .attr('class', 'idn-y idn-axis');

    var countryLines,
        visibleDateCO2e = [];


    let animated, raf;

    let groups = {
        countries: svg.append('g').attr('class', 'idn-countries')
    }


    let countriesLines = groups.countries
        .selectAll('line')
        .data(countries)
    countriesLines.enter()
        .append('line')
        .attr({'class': 'idn-preset__line'})

    let countriesText = groups.countries
        .selectAll('text')
        .data(countries)
    countriesText.enter()
        .append('text')
        .attr({'class': 'idn-preset__country', 'dy': '0.3em'/*, 'dx': -20*/})
        .text(d => d.name)

    let ylabel = svg.append("text")
        .attr("class", "idn-y idn-label")
        .attr("text-anchor", "middle")
        .attr("y", 0)
        .attr("dy", "12px")
        .attr("transform", "rotate(-90)")

    let ylabel2 = svg.append("text")
        .attr({
            "class": "idn-y idn-label",
            "text-anchor": "end",
            /*"dx": -20,*/
            "y": 0, "dy": "10px"
        })

    let resize = () => {
        let rect = el.getBoundingClientRect(),
        width = rect.width - margin.left - margin.right,
        height = rect.height - margin.top - margin.bottom;

        x.range([0, width]);
        y.range([height, 0]);

        xaxis.call(xAxis);
        yaxis.call(yAxis);

        svg
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
        xaxis.attr('transform', 'translate(0,' + height + ')')

        xAxis.ticks(width < 300 ? 3 : 5)
            .tickFormat(d3.time.format(width < 800   ? '%b' : '%B'))

        yAxis.ticks(height < 250 ? 4 : 10)

        ylabel
            .attr("dx", height/-1.8)
            .text(height < 250 ? 'CO2e (Mt)' : 'CO2e emissions (metric tons)');

        ylabel2
            .attr({x: width, y: y(1344.58 * 1000000) - 40})
            .text(height < 250 ? 'Annual CO2e (Mt)' : 'Annual CO2e emissions (metric tons)');

        countriesText
            .attr({x: width, y: d => y(d.emissions), display: d => d.hideAtSmallSize && height < 250 && 'none'});

        countriesLines
            .attr({
                x1: 0, y1: d => y(d.emissions),
                x2: width - 20, y2: d => y(d.emissions),
                display: d => d.hideAtSmallSize && height < 250 && 'none'
            })

        if (animated) animate();
    }

    var path = svg.append('path')
        .datum([])
        // .datum(cumulativeData)
        .attr('class', 'idn-line')
        .attr('d', line);

    function animationFrame(date, instant) {
        var co2e = cumulativeData[date];
        countriesText.classed('idn-preset__country--on', d => d.emissions < co2e.emissions)
        countriesLines.classed('idn-preset__line--on', d => d.emissions < co2e.emissions)
        visibleDateCO2e.push(co2e);
        path.datum(visibleDateCO2e).attr('d', line);
        if (date < cumulativeData.length - 1) {
            let nextFrame = animationFrame.bind(null, date + 1, instant);
            if (instant) nextFrame();
            else raf = window.requestAnimationFrame(nextFrame);
        }
    }

    function animate() {
        visibleDateCO2e = [];
        window.cancelAnimationFrame(raf);
        animationFrame(0, animated);
        animated = true;
    }
    resize();
    return {
        animate: animate,
        resize: resize
    }
}

// domready(() => {
//     load(document.body, data)
// });

export default load;
