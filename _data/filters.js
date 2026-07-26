import { readFileSync } from 'node:fs'

export default function () {
	const records = JSON.parse(
		readFileSync(new URL('./discogs-collection.json', import.meta.url))
	)

	const formats = new Set()
	const types = new Set()
	const genres = new Set()

	for (const record of records) {
		formats.add(record.format)
		types.add(record.type)
		for (const genre of record.genres) {
			genres.add(genre)
		}
	}

	return {
		formats: [...formats].sort(),
		types: [...types].sort(),
		genres: [...genres].sort(),
	}
}
