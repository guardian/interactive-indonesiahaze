import pip from 'point-in-polygon';

export function isPointInsidePolygon(pointCoords, polygonCoords) {
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

export function isPointInsideFeature(point, feature) {
	if (feature.type !== 'Feature') {
		console.log(`Not a GeoJSON feature: ${feature.type}`)
		process.exit(1);
	}

	if (feature.geometry.type === 'Polygon') {
		return isPointInsidePolygon(point.geometry.coordinates, feature.geometry.coordinates);
	}
	else if (feature.geometry.type === 'MultiPolygon') {
		let polygons = feature.geometry.coordinates;
		for (var i = 0; i < polygons.length; i++) {
			if (isPointInsidePolygon(point.geometry.coordinates, polygons[i])) return true;
		}
	} else {
		console.log(`Unsupported type ${feature.type}`);
		process.exit(1);
	}
	return false
}
