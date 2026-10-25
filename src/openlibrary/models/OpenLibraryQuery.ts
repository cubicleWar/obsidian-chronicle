export type OpenLibraryQuery = Record<string, string | number | null | undefined>;

const OL_SEARCH_FIELDS = [
	"key",
	"title",
	"author_name",
	"author_key",
	"first_publish_year",
	"cover_i",
	"cover_edition_key",
	"editions",
	"editions.key",
	"editions.title"
]

export const OL_FIELDS_QUERY = OL_SEARCH_FIELDS.join(",");
