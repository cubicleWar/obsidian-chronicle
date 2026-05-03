import { Chronicle } from './chronicle/Chronicle.js'
import Handlebars from "handlebars";
import { toMarkdownlist } from 'obsidianx/formatters.js';
import { toBacklink } from 'obsidianx/formatters.js';
import { toYamlSafeString } from 'obsidianx/formatters.js';

Handlebars.registerHelper('list', (value) => toMarkdownlist(value));
Handlebars.registerHelper('backlink', (value, mode) => toBacklink(value, mode));
Handlebars.registerHelper('safeYamlString', (value) => toYamlSafeString(value))

export default Chronicle;