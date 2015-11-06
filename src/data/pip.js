import pip from 'point-in-polygon';
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

function isPointInsidePolygon(pointCoords, polygonCoords) {
	if (polygonCoords.length === 1) {
		return pip(pointCoords, polygonCoords[0])
	} else if (polygonCoords.length === 2) {
		let isInInnerRing = pip(pointCoords, polygonCoords[1])
		return isInInnerRing ? false : pip(pointCoords, polygonCoords[0]);
	} else if (polygonCoords.length > 2) {
		let isInOuterRing = pip(pointCoords, polygonCoords[0])
		if (!isInOuterRing) return false;
		for (var i = 1; i < polygonCoords.length; i++) {
			let isInInnerRing = pip(pointCoords, polygonCoords[i]);
			if (isInInnerRing) return false;
		}
		return true;

	} else {
		console.log(`Polygons with length ${polygonCoords.length} not supported`);
		process.exit(1);
	}

}
function isPointInside(point, concession) {
	if (concession.type !== 'Feature') {
		console.log(`Not a GeoJSON feature: ${concession.type}`)
		process.exit(1);
	}

	if (concession.geometry.type === 'Polygon') {
		return isPointInsidePolygon(point.geometry.coordinates, concession.geometry.coordinates);
	}
	else if (concession.geometry.type === 'MultiPolygon') {
		let polygons = concession.geometry.coordinates;
		for (var i = 0; i < polygons.length; i++) {
			if (isPointInsidePolygon(point.geometry.coordinates, polygons[i])) return true;
		}
	} else {
		console.log(`Unsupported type ${concession.type}`);
		process.exit(1);
	}
	return false
}

function main() {

	console.log(`${firesgeo.features.length} total fires`);

	let fires = firesgeo.features;

	let concessions = {
		moratorium: moratoriumgeo.features,
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
