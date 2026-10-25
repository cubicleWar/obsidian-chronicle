import { ARTWORK_PROPERTIES, ARTWORK_EMBED } from "./ArtworkTemplate.js";
import { templateMetadata } from "./TemplateMetadata.js";

export const BOOK_TEMPLATE = {
	name: "Book Template",
	content: `---
title: {{ safeYamlString title }}
gb_id: {{ safeYamlString gb_id }}
olib_id: {{ safeYamlString olib_id }}
olib_edition_id: {{#if olib_edition_id}}{{ safeYamlString olib_edition_id }}{{else}}""{{/if}}
subtitle: {{#if subtitle}}{{ safeYamlString subtitle }}{{else}}""{{/if}}
edition: {{ safeYamlString edition }}
categories: {{ yaml categories }}
authors: {{ yaml authors }}
genres: {{ yaml genres }}
subjects: {{ yaml subjects }}
publishers: {{ yaml publishers }}
publication_date: {{ safeYamlString publication_date }}
publication_year: {{ publication_year }}
first_publication_year: {{ first_publication_year }}
pages: {{ pages }}
estimated_word_count: {{ estimated_word_count }}
isbn10: {{ yaml isbn10 }}
isbn13: {{ yaml isbn13 }}
languages: {{ yaml languages }}
${ARTWORK_PROPERTIES}
read_dates: {{ yaml read_dates }}
${templateMetadata("book-2026-10-25a")}
---

# {{ title }}

${ARTWORK_EMBED}

{{ overview }}
`
};
