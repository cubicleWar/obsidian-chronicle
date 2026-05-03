# Obsidian Chronicle

## Overview

Chronicle is a plugin for obsidian that allows you to record details about media (movies and tv series) and document when you watched them.


## Configuration

### Overview

Chronicle has several parameters that can be set in the configuration panel. At a high level these parameters are:

- **API keys** - Your personal API keys to access data sources abd retrieve information about specific titles
- **Note templates** - The paths to the templates used to generate notes for each media type.
- **Note locations** - The folder to save notes created for each respective media type.
- **Artwork** - An option to save the artwork for each media type locally. General Settings??

### API Keys

Several datasources can be configured for used in the generation of notes:

- Open Movie Database (OMDB) - You can create a free api key [here](https://www.omdbapi.com/apikey.aspx)
- The Movie Database (TMDB) - You will need to first [create a TMDB account](https://www.themoviedb.org/signup) before generating a TMDB [API key](https://developer.themoviedb.org/docs/getting-started).

If all API keys are set Chronicle, will get the data for a given title from a primary source and then attempt to enrich the data from secondary sources. The enrichment process fills empty values in the primary data and combines lists from each source e.g. actors. This is useful as data for a given title is not always available or complete when sourced from a single API.

### Templates

These settings are the paths to the templates used to generate notes for each media type chronicled e.g. movies, tv series and miniseries media.

The best way to get started is to use the reference templates, which can be saved to you vault by going to Chronicle Settings > General Settings > Export reference templates.

Once they are saved in your vault move them to your preferred location and then set the path in the template path settings under each of the media type categories.

### Locations


## Media

The data enrichment process will use the following order of precedence when generating the record for a given title:

| Media Type     | Definition                                                    | Primary Source | Secondary source  |
| :------------- | :------------------------------------------------------------ | :------------- | :---------------- |
| Movie          | [media/models/Movie](src/media/models/Movie.ts)               | OMDB           | TMDB              |
| Series         | [media/models/Series](src/media/models/Series.ts)             | TMDB           | OMDB              |
| Series Season  | [media/models/SeriesSeason](src/media/models/SeriesSeason.ts) | TMDB           | OMDB              |
| Miniseries     | [media/models/Miniseries](src/media/models/Miniseries.ts)     | TMDB           | OMDB              |


## Movies


eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzZWRjMzExYWJmZTA5YjllZTI1NWVhYWQ2ZmQ0Y2EwMCIsIm5iZiI6MTc2ODI5MzIyNi4xOTUwMDAyLCJzdWIiOiI2OTY2MDM2YWYwZjk3Mjg1ZDk3Y2M4NzIiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.gyutFVuM7huJTSLUTnm8ru8DMAJ5JYDKZRKoDq9kalk

## TV Series

### Overview

### Regular Series

### Miniseries

## Templates

### Format

You can customize these templates as desired.

### Functions

| Function | Description |
| :------- | | :----------------------|

## Developer Guide

For a quick test build:

	npm run build-dev

For a production build:

	npm run build


## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

### What this means

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