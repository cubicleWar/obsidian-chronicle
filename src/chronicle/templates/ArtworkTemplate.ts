// Shared by every reference template that displays a cover.
export const ARTWORK_VALUE = '{{#if artwork_local}}{{ backlink artwork_local }}{{else}}{{#if artwork}}{{ safeYamlString artwork }}{{else}}""{{/if}}{{/if}}';

export const ARTWORK_EMBED = `{{#if artwork_local}}
{{ backlink artwork_local "embed" }}
{{else}}{{#if artwork}}
![Cover](<{{ artwork }}>)
{{/if}}{{/if}}`;

export const ARTWORK_PROPERTIES = `artwork: ${ARTWORK_VALUE}
artwork_url: {{ safeYamlString artwork }}
artwork_local: {{#if artwork_local}}{{ backlink artwork_local }}{{else}}""{{/if}}`;
