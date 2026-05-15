import { Chronicle } from './chronicle/Chronicle.js'
import Handlebars from "handlebars";
import { toMarkdownlist, toBacklink, toYamlSafeString } from 'obsidianx/helpers/formatters.js';

Handlebars.registerHelper('list', toMarkdownlist);
Handlebars.registerHelper('backlink', toBacklink);
Handlebars.registerHelper('safeYamlString', toYamlSafeString)

export default Chronicle;