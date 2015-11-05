import path from 'path';

var pip = require(path.join(__dirname, '../../data/out/pip.json'));

(['fiber', 'palm']).forEach(key => {

	let concessions = pip[key];

	let sortedByFires = concessions.slice().sort((b,a) => a.fires > b.fires ? 1 : b.fires > a.fires ? -1 : 0)
	let sortedByFiresPerHa = concessions.slice().sort((b,a) => a.fires_per_ha > b.fires_per_ha ? 1 : b.fires_per_ha > a.fires_per_ha ? -1 : 0)

	function prettyPrint(concession) {
		return `${concession.group} - ${concession.fires} fires (${concession.fires_per_ha} per ha)`;
	}

	console.log(`TOP ${key} FIRE COUNTS:`)
	sortedByFires.slice(0,10).map(prettyPrint).forEach(str => console.log(str))
	console.log(`TOP ${key} FIRE_PER_HA COUNTS:`)
	sortedByFiresPerHa.slice(0,10).map(prettyPrint).forEach(str => console.log(str))

})
