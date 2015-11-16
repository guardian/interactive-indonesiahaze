import {isPointInsideFeature} from './ispip.js';
import path from 'path';
import fs from 'fs';
// import proecss

var dataOutdir = path.join(__dirname, '../../data/out');
var outpath = n => path.join(dataOutdir, n);

var firesgeo = require(outpath('fires.json'));
var fibergeo = require(outpath('fiber.json'));
var palmgeo = require(outpath('palmoil.json'));
var logginggeo = require(outpath('logging.json'));
var moratoriumgeo = require(outpath('moratorium.json'));

var outfilepath = outpath('pip.json');

function filterFires(fires) {
	var geo = require(outpath('geo.json'));
	let idn = geo.features.filter(d => d.properties.SOV_A3 === 'IDN')[0]
	fires.features = fires.features
		.filter(f => isPointInsideFeature(f, idn))
	return fires;
}

function main() {

	console.log(`${firesgeo.features.length} total fires`);

	let fires = firesgeo.features;

	console.log('Filtering to IDN fires only'); fires = filterFires(firesgeo).features;

	let concessions = {
		// moratorium: moratoriumgeo.features,
		fiber: fibergeo.features,
		palm: palmgeo.features,
		logging: logginggeo.features,
	}

	Object.keys(concessions).map(c => console.log(`${concessions[c].length} ${c} concessions`));


	let keys = Object.keys(concessions);
	let out = {};
	keys.forEach(key => {
		out[key] = [];
		concessions[key].map((c,i) => {
			console.log(`${key} - ${i} / ${concessions[key].length}`);
			let fireCount = fires.filter(f => isPointInsideFeature(f, c)).length;
			let area_ha = c.properties.area_ha || c.properties.AREA_HA || c.properties.Shape_Area;
			out[key].push({
				id: c.properties.OBJECTID,
				group: c.properties.group_comp || c.properties.GROUP_,
				company: c.properties.company || c.properties.COMPANY,
				name: c.properties.name || c.properties.NAME,
				area_ha: area_ha,
				fires: fireCount,
				fires_per_ha: fireCount / area_ha
			});
		});
		fs.writeFileSync(outpath(key + '-collisions.json'), JSON.stringify(out[key], null, 2));
	})

	fs.writeFileSync(outfilepath, JSON.stringify(out, null, 2))
}

main();
