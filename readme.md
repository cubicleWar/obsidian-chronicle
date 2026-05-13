# Obsidian Chronicle

An Obsidian plugin to chronicle your life through the stories you watch and read.

## Usage

### Setup

1. Install Chronicle from Settings → Community plugins → Browse, search for Chronicle, select it, then click Install and Enable.
2. Create or export reference [templates](https://github.com/cubicleWar/obsidian-chronicle/blob/main/readme.md#templates)
3. [Configure the settings](#configuration)

### Use

1. Open the Command Palette.
2. Run  `Chronicle: Movie` or `Chronicle: TV Series`.
3. Enter the title.
4. Select the correct result.
5. Chronicle creates or updates a note in your configured media folder.

## Configuration

### API Keys

These are your personal API keys to access data sources and retrieve information about specific titles. Several datasources can be configured for used in the generation of notes:

- Open Movie Database (OMDB) - A web service to obtain movie information, where all content and images on the site are contributed and maintained by users. You can create a free api key [here](https://www.omdbapi.com/apikey.aspx).
- The Movie Database (TMDB) - A community built movie and TV database. You will need to first [create a TMDB account](https://www.themoviedb.org/signup) before generating a TMDB [API key](https://developer.themoviedb.org/docs/getting-started).

If all API keys are set, Chronicle will get the data for a given title from a primary source and then enrich with data from the secondary source to improve the completeness of the record. The data structures and data sources for each media type are listed below:

| Media Type     | Object Definition                                             | Primary Source | Secondary source  |
| :------------- | :------------------------------------------------------------ | :------------- | :---------------- |
| Movie          | [media/models/Movie](src/media/models/Movie.ts)               | OMDB           | TMDB              |
| Series         | [media/models/Series](src/media/models/Series.ts)             | TMDB           | OMDB              |
| Series Season  | [media/models/SeriesSeason](src/media/models/SeriesSeason.ts) | TMDB           | OMDB              |
| Miniseries     | [media/models/Miniseries](src/media/models/Miniseries.ts)     | TMDB           | OMDB              |

### Artwork

This specifies whether Chronicle should download the artwork for any chronicled media, such as the poster for a movie, and where the artwork should be saved locally.

### Media

#### Templates

Each media type requires a template in order to generate notes. Templates will describe the structure and content of notes including where to include associated properties like title, director or actors.

The best way to get started is to use the reference templates, which can be saved to you vault by going to *Chronicle Settings > General Settings > Export reference templates*. Once they are saved in your vault move them to your preferred location and then set the path in the template path settings under each of the media categories.

#### Folders

Each media type will be saved in the folder you specify, allowing your to easily separate each category of media.

## Templates

### Content

The note templates are structured just like any other Obsidian note. However the attributes of the title being chronicled may be used throughout the template using the [Handlebars](https://handlebarsjs.com) templating system, for example the body of a movie note may have the following template:


	# {{ title }}

	{{ backlink artwork_local "embed"}}

	{{ overview }}

The data available for each media type can be seen in the Object Definitions linked in the table above. As previously mentioned it is recommended to export the reference templates to get started quickly.

### Helper Functions

There are several helper functions that can be used in your templates to improve template rendering. You can see these in action in the reference templates, and a brief overview of each function is listed below.

#### backlink

*Usage: {{ backlink \<path\> "mode"}}*

Converts a path to a Obsidian back link. Three modes can be specified:

| Mode  | Description                             | Output         |
| :---- | :-------------------------------------- | :------------- |
| fm    | Formats a path for use in front matter  | `"[[path]]"`   |
| embed | Formats for embedding the linked asset  | `![[path]]`    |
| body  | The typical backlink notation           | `[[backlink]]` |

#### list

*Usage: {{ list \<array\>}}*

Converts an array of strings, or a string of values delimited by a comma into a markdown list.

#### safeYamlString

*Usage: {{ safeYamlString \<variable\> }}*

Converts a string into a YAML-safe scalar string to prevent errors in the notes front matter.

## Troubleshooting

### Posters are not saved or {{ artwork_local }} is an empty string

Check that poster saving is enabled and that the artwork folder is configured.

## Privacy

Chronicle stores your media notes, watch history, read history, settings, and generated metadata inside your Obsidian vault. Chronicle does not operate a server, does not collect analytics, does not use telemetry, and does not sell or share your personal data.

### Network requests

Chronicle may make network requests to third-party media data providers when you search for or retrieve metadata about movies, series, books, or other media. These services are limited to those for which you provide api keys as listed in the [API Keys](#api-keys) configuration section.

When Chronicle sends a request to a metadata provider, the request may include the search terms, title, author, year, media identifier (such as id), and the API key required to retrieve the requested metadata.

Chronicle does not send the contents of your Obsidian notes to these services.

### API keys

If you configure API keys, Chronicle stores them in the plugin settings inside your local Obsidian vault configuration. These keys are used only to make requests to the relevant third-party metadata provider.

You should review the privacy policy and terms of any third-party metadata provider you choose to use.

### Local data

Chronicle may create or update notes in your vault, including frontmatter fields. Chronicle only modifies files as part of the commands, settings, and workflows you enable.

### No telemetry

Chronicle does not collect usage analytics, crash reports, behavioral data, or telemetry.

### User control

You can disable or remove Chronicle at any time. Any notes already created by Chronicle remain in your vault unless you delete them yourself.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

### What this Means

You are free to:

- Use this plugin for personal or commercial purposes
- Modify and distribute the code
- Include it in other projects

Under the following conditions:

- You must include the original license and copyright notice

### Disclaimer

This plugin is provided "as is", without warranty of any kind. Use at your own risk.

### Third-Party Services

This plugin may integrate with third-party APIs (e.g. OMDb, TMDb).
Use of those services is subject to their respective terms and conditions.