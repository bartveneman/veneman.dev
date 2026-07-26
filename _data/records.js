import { readFileSync, existsSync } from 'node:fs'
import { normalize_title } from './lib/normalize-title.js'

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

// Fallback tiebreaker: the same ordering the page used before Last.fm sorting existed
function fallbackCompare(a, b) {
	if (bucketRank(a) !== bucketRank(b)) return bucketRank(a) - bucketRank(b)
	if (a.featured !== b.featured) return a.featured ? -1 : 1
	if (a.format !== b.format) return formatRank(a.format) - formatRank(b.format)
	return a.artist.localeCompare(b.artist)
}

// When the same album exists as both Vinyl and another format, only the Vinyl copy
// should show up as "played" — the other copies lose their play credit entirely.
function preferVinylPlays(records) {
	const groups = new Map()
	for (const record of records) {
		const key = `${normalize_title(record.artist)}::${normalize_title(record.title)}`
		if (!groups.has(key)) groups.set(key, [])
		groups.get(key).push(record)
	}

	for (const group of groups.values()) {
		if (group.length < 2) continue
		const vinyl = group.find((record) => record.format === 'Vinyl')
		if (!vinyl) continue

		for (const record of group) {
			if (record === vinyl) continue
			record.lastPlayed = null
			record._lastPlayedMatchRank = 0
		}
	}
}

function formatDate(uts) {
	const date = new Date(uts * 1000)
	const dd = String(date.getDate()).padStart(2, '0')
	const mm = String(date.getMonth() + 1).padStart(2, '0')
	return `${dd}-${mm}-${date.getFullYear()}`
}

function loadLastfmPlays() {
	const url = new URL('./lastfm-plays.json', import.meta.url)
	if (!existsSync(url)) return { albums: {}, artists: {} }
	return JSON.parse(readFileSync(url, 'utf8'))
}

// matchRank: 2 = exact album match, 1 = artist-level fallback, 0 = no match at all.
// Exact matches must outrank fallback matches even when the timestamps happen to tie
// (e.g. the artist's most recent scrobble IS the album that matched exactly).
function lastPlayedFor(record, plays) {
	const artistKey = normalize_title(record.artist)
	const albumKey = `${artistKey}::${normalize_title(record.title)}`

	if (albumKey in plays.albums) {
		return { timestamp: plays.albums[albumKey], matchRank: 2 }
	}
	if (artistKey in plays.artists) {
		return { timestamp: plays.artists[artistKey], matchRank: 1 }
	}
	return { timestamp: null, matchRank: 0 }
}

export default function () {
	const records = JSON.parse(
		readFileSync(new URL('./discogs-collection.json', import.meta.url))
	)
	const plays = loadLastfmPlays()

	for (const record of records) {
		const { timestamp, matchRank } = lastPlayedFor(record, plays)
		record.lastPlayed = timestamp
		record._lastPlayedMatchRank = matchRank
		// The master release's original year is what listeners usually mean by
		// "what year is this from" — prefer it over this specific pressing's year.
		record.year = record.originalYear || record.year || 'Unknown'
	}

	preferVinylPlays(records)

	for (const record of records) {
		record.lastPlayedLabel =
			record._lastPlayedMatchRank === 2 ? formatDate(record.lastPlayed) : null
	}

	return records.sort((a, b) => {
		// DVDs always sink to the very bottom, even if they're the most recently played thing.
		const aIsDvd = a.format === 'DVD'
		const bIsDvd = b.format === 'DVD'
		if (aIsDvd !== bIsDvd) return aIsDvd ? 1 : -1

		// Match specificity comes next: every exact album match outranks every
		// artist-level fallback, regardless of raw timestamps.
		if (a._lastPlayedMatchRank !== b._lastPlayedMatchRank) {
			return b._lastPlayedMatchRank - a._lastPlayedMatchRank
		}
		if (a.lastPlayed !== b.lastPlayed) {
			if (a.lastPlayed === null) return 1
			if (b.lastPlayed === null) return -1
			return b.lastPlayed - a.lastPlayed
		}
		return fallbackCompare(a, b)
	})
}
