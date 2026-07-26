import { readFileSync } from 'node:fs'

const FORMAT_ORDER = ['Vinyl', 'CD']
const LAST_GENRE = "Children's"

function formatRank(format) {
	const index = FORMAT_ORDER.indexOf(format)
	return index === -1 ? FORMAT_ORDER.length : index
}

function isChildrens(record) {
	return record.genres.includes(LAST_GENRE)
}

// 0: everything else, 1: Children's (non-DVD), 2: DVD (always last, even if Children's)
function bucketRank(record) {
	if (record.format === 'DVD') return 2
	if (isChildrens(record)) return 1
	return 0
}

export default function () {
	const records = JSON.parse(
		readFileSync(new URL('./discogs-collection.json', import.meta.url))
	)

	return records.sort((a, b) => {
		if (bucketRank(a) !== bucketRank(b)) return bucketRank(a) - bucketRank(b)
		if (a.featured !== b.featured) return a.featured ? -1 : 1
		if (a.format !== b.format) return formatRank(a.format) - formatRank(b.format)
		return a.artist.localeCompare(b.artist)
	})
}
