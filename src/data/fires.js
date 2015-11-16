import {isPointInsideFeature} from './ispip.js';
import pip from 'point-in-polygon';
import path from 'path';
import fs from 'fs';

let dataDir = path.resolve(__dirname, '../../data/out');

function filterFires(fires) {
	var geo = require(path.join(dataDir, 'geo.json'));
	let idn = geo.features.filter(d => d.properties.SOV_A3 === 'IDN')[0]
	fires.features = fires.features
		.filter(f => isPointInsideFeature(f, idn))
	return fires;
}

function main() {
	let viewport = [
		[94.54439575802559, 5.920674895078703],
		[119.45560424197443, 5.920674895078703],
		[119.45560424197443, -5.920674895078703],
		[94.54439575802559, -5.920674895078703]
	]

	let fires = require(path.join(dataDir, 'fires.json'));

	// console.log('Filtering to IDN fires only'); fires = filterFires(fires);

	let totalFires = fires.features.length;

	// let firstDate = '2015/06/01';
	fires.features = fires.features.filter(f => {
		return /*f.properties.CONFIDENCE > 50 && */pip(f.geometry.coordinates, viewport)/* && f.properties.ACQ_DATE >= firstDate*/;
	})
	let perc = ((fires.features.length / totalFires) * 100).toFixed(2);
	console.log(`${fires.features.length} / ${totalFires} (${perc}%) kept`);

	let outfile = path.join(dataDir, 'filteredfires.json');

	fs.writeFileSync(outfile, JSON.stringify(fires, null, 2));
}

main();
