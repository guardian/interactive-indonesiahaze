import {isPointInsideFeature} from './ispip.js';
import path from 'path';
import fs from 'fs';

var dataOutdir = path.join(__dirname, '../../data/out');
var outpath = n => path.join(dataOutdir, n);

var firesgeo = require(outpath('fires.json'));
var geo = require(outpath('geo.json'));

function main() {
	let idn = geo.features.filter(d => d.properties.SOV_A3 === 'IDN')[0]
	let indofiresFeatures = firesgeo.features
		.filter(f => isPointInsideFeature(f, idn))

	firesgeo.features = indofiresFeatures;
	fs.writeFileSync(outpath('indofires.json'), JSON.stringify(firesgeo, null, 2));
}

main();
