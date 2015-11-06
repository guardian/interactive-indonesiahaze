import path from 'path';
import lodash from 'lodash';

var pip = require(path.join(__dirname, '../../data/out/pip.json'));
var fires = require(path.join(__dirname, '../../data/out/fires.json'));

(['fiber', 'palm', 'logging']).forEach(key => {
	let numFires = fires.features.length;
	let concessionFires = pip[key].map(c => c.fires).reduce((a,b) => a+b);
	let perc = (concessionFires / numFires * 100).toFixed(2);
	console.log(`${key} ${perc}% - ${concessionFires} / ${numFires}`);
});

(['fiber', 'palm']).forEach(key => {
	let concessions = pip[key];
	let sortedByFires = concessions.slice().sort((b,a) => a.fires > b.fires ? 1 : b.fires > a.fires ? -1 : 0)
	let sortedByFiresPerHa = concessions.slice().sort((b,a) => a.fires_per_ha > b.fires_per_ha ? 1 : b.fires_per_ha > a.fires_per_ha ? -1 : 0)

	function prettyPrint(concession) {
		return `${concession.id} ${concession.group} - ${concession.fires} fires (${concession.fires_per_ha.toFixed(5)} per ha)`;
	}

	console.log(`TOP ${key} FIRE COUNTS:`)
	sortedByFires.slice(0,10).map(prettyPrint).forEach(str => console.log(str))
	console.log(`TOP ${key} FIRE_PER_HA COUNTS:`)
	sortedByFiresPerHa.slice(0,10).map(prettyPrint).forEach(str => console.log(str))

})
