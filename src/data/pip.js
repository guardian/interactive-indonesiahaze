import pip from 'point-in-polygon';
import path from 'path';
import fs from 'fs';

var firesgeo = require(path.join(__dirname, '../../data/out/fires.json'));
var fibergeo = require(path.join(__dirname, '../../data/out/fiber.json'));
var palmgeo = require(path.join(__dirname, '../../data/out/palmoil.json'));
var logginggeo = require(path.join(__dirname, '../../data/out/logging.json'));

var outfilepath = path.join(__dirname, '../../data/out/pip.json');

function isPointInside(point, concession) {
	let fireCoord = point.geometry.coordinates;
	let polygons = concession.geometry.coordinates;
	for (var i = 0; i < polygons.length; i++) {
		if (pip(fireCoord, polygons[i])) return true;
	}
	return false
}

function main() {

	console.log(`${firesgeo.features.length} total fires`);

	let fires = firesgeo.features;

	let concessions = {
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
			let fireCount = fires.filter(f => isPointInside(f, c)).length;
			let area_ha = c.properties.area_ha || c.properties.AREA_HA;
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
	})

	fs.writeFileSync(outfilepath, JSON.stringify(out, null, 2))
}

main();
