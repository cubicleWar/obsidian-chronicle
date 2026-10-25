import { GoogleBooksVolumeInfo } from "./GoogleBooksVolumeInfo.js";

export interface GoogleBooksVolume
{
	kind: "books#volume";
	id: string;
	etag: string;
	selfLink: string;
	volumeInfo: GoogleBooksVolumeInfo;
}
