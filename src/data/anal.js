import path from 'path';
import lodash from 'lodash';


let total_area_k2 = 1.919 * 1000000;
let total_area_ha = total_area_k2 * 100;

var palmoil = require(path.join(__dirname, '../../data/out/palmoil.json'));
let palm_area_ha = palmoil.features
	.filter(d => d.properties.country === 'IDN')
	.map(d => d.properties.area_ha)
	.reduce((a,b) => a+b)

var fiber = require(path.join(__dirname, '../../data/out/fiber.json'));
let fiber_area_ha = fiber.features
	.filter(d => d.properties.country === 'IDN')
	.map(d => d.properties.area_ha)
	.reduce((a,b) => a+b)

var logging = require(path.join(__dirname, '../../data/out/logging.json'));
let logging_area_ha = logging.features
	.filter(d => d.properties.COUNTRY === 'Indonesia')
	.map(d => d.properties.AREA_HA)
	.reduce((a,b) => a+b)

console.log(`PALM ${palm_area_ha} / ${total_area_ha} = ${((palm_area_ha / total_area_ha) * 100).toFixed(2)}% `);
console.log(`FIBER ${fiber_area_ha} / ${total_area_ha} = ${((fiber_area_ha / total_area_ha) * 100).toFixed(2)}% `);
console.log(`LOGGING ${logging_area_ha} / ${total_area_ha} = ${((logging_area_ha / total_area_ha) * 100).toFixed(2)}% `);
