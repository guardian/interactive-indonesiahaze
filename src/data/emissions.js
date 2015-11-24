import pip from 'point-in-polygon';
import path from 'path';
import fs from 'fs';
import strftime from 'strftime';
import _ from 'lodash';

let dataDir = path.resolve(__dirname, '../../data/out');
const co2PerFire = 14015.70;

function groupBy(arr, fn) {
    var obj = {};
    for (var i = 0; i < arr.length; i++) {
        let key = fn(arr[i]);
        obj[key] = obj[key] || [];
        obj[key].push(arr[i])
    }
    return obj;
}

function main() {
	let viewport = [
		[94.54439575802559, 5.920674895078703],
		[119.45560424197443, 5.920674895078703],
		[119.45560424197443, -5.920674895078703],
		[94.54439575802559, -5.920674895078703]
	]

	let fires = require(path.join(dataDir, 'indofires.json'));
	let numFiresByDate = _(fires.features)
		.groupBy(d => d.properties.ACQ_DATE)
		.mapValues(arr => arr.length)
		.valueOf();
	console.log(Object.keys(numFiresByDate));

	function dateRange(start, end) {
		function addDays(date, days) {
		    var dat = new Date(date.valueOf());
		    dat.setDate(dat.getDate() + days);
		    return dat;
		}

		let dates = [],
			date = start;
		while (date <= end) {
			dates.push(date);
			let dateObj = addDays(new Date(date), 1);
			date = strftime('%Y/%m/%d', dateObj);
		}
		return dates;
	}

	let out = dateRange('2015/03/01', '2015/11/23').map(date => {
		return {
			date: date,
			emissions: Math.round(numFiresByDate[date] * co2PerFire)
		};
	})

	let outfile = path.join(dataDir, 'emissions.json');
	fs.writeFileSync(outfile, JSON.stringify(out, null, 2));
}

main();
