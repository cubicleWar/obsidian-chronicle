import { ChronicleSettings } from "./ChronicleSettings";
import { ValidationResult } from "obsidianx/models/SettingsValidation";


export function settingsValidator(settings: ChronicleSettings, mode?: "movie" | "series"): ValidationResult
{
	const errors: string[] = [];

	if (!settings.omdb_api_key && !settings.tmdb_api_key)
	{
		errors.push("At least one api key must be specified to retrieve title data");
	}

	if(mode === "movie" || mode === undefined)
	{
		if(!settings.movie_template_path)
		{
			errors.push("The movie template path must be specified to chronicle movies");
		}
	}

	if(mode === "series" || mode === undefined)
	{
		if(!settings.series_template_path)
		{
			errors.push("The series template path must be specified to chronicle series");
		}

		if(!settings.series_season_template_path)
		{
			errors.push("The series season template path must be specified to chronicle series");
		}

		if(settings.differentiate_miniseries && !settings.miniseries_template_path)
		{
			errors.push("The miniseries template path must be specified to chronicle series");
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}