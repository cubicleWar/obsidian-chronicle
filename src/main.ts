import { Chronicle } from './chronicle/Chronicle.js'
import Handlebars from "handlebars";

Handlebars.registerHelper('list', function(value) {
	let list = ``;

	if(typeof value === 'string')
	{
		value = value.split(',').map(item => item.trim());
	}

	if(Array.isArray(value))
	{
		for(let i = 0, len = value.length; i < len; i++)
		{
			list += `\n  - ${value[i]}`
		}

		return list;
	}
	else
	{
		return value;
	}
});

export default Chronicle;