import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
import { normalize_title } from '../_data/lib/normalize-title.js'

const API_KEY = process.env.LASTFM_API_KEY
const USERNAME = process.env.LASTFM_USERNAME
if (!API_KEY || !USERNAME) {
	console.error(
		'Missing LASTFM_API_KEY or LASTFM_USERNAME. Copy .env.example to .env and fill them in.'
	)
	process.exit(1)
}

const API_ROOT = 'https://ws.audioscrobbler.com/2.0/'
const PLAYS_JSON = new URL('../_data/lastfm-plays.json', import.meta.url)
const PAGE_LIMIT = 200
const RATE_LIMIT_DELAY_MS = 250

function load_cache() {
	if (!existsSync(PLAYS_JSON)) {
		return { lastSyncedAt: 0, albums: {}, artists: {} }
	}
	return JSON.parse(readFileSync(PLAYS_JSON, 'utf8'))
}

function save_cache(cache) {
	writeFileSync(PLAYS_JSON, JSON.stringify(cache, null, '\t') + '\n')
}

async function get_recent_tracks_page(page, from) {
	const params = new URLSearchParams({
		method: 'user.getrecenttracks',
		user: USERNAME,
		api_key: API_KEY,
		format: 'json',
		limit: String(PAGE_LIMIT),
		page: String(page),
	})
	if (from > 0) params.set('from', String(from))

	const res = await fetch(`${API_ROOT}?${params}`)
	if (!res.ok) {
		throw new Error(`Last.fm API error ${res.status} for page ${page}: ${await res.text()}`)
	}

	const data = await res.json()
	if (data.error) {
		throw new Error(`Last.fm API error ${data.error}: ${data.message}`)
	}

	return data.recenttracks
}

function merge_scrobble(cache, track) {
	// The currently-playing track has no timestamp, skip it
	if (track['@attr']?.nowplaying) return null

	const uts = Number(track.date?.uts)
	if (!uts) return null

	const artist = track.artist?.['#text']
	const album = track.album?.['#text']
	if (!artist) return null

	const artist_key = normalize_title(artist)
	if (!artist_key) return null

	cache.artists[artist_key] = Math.max(cache.artists[artist_key] ?? 0, uts)

	if (album) {
		const album_key = `${artist_key}::${normalize_title(album)}`
		cache.albums[album_key] = Math.max(cache.albums[album_key] ?? 0, uts)
	}

	return uts
}

async function main() {
	const cache = load_cache()
	const from = cache.lastSyncedAt > 0 ? cache.lastSyncedAt + 1 : 0
	let newest_seen = cache.lastSyncedAt

	let page = 1
	let total_pages = 1

	do {
		const recenttracks = await get_recent_tracks_page(page, from)
		const tracks = [].concat(recenttracks.track ?? [])
		total_pages = Number(recenttracks['@attr']?.totalPages ?? 1)

		console.log(`[page ${page}/${total_pages}] ${tracks.length} scrobbles`)

		for (const track of tracks) {
			const uts = merge_scrobble(cache, track)
			if (uts && uts > newest_seen) newest_seen = uts
		}

		cache.lastSyncedAt = newest_seen
		save_cache(cache)

		page += 1
		if (page <= total_pages) await sleep(RATE_LIMIT_DELAY_MS)
	} while (page <= total_pages)

	console.log(
		`Synced. Tracking ${Object.keys(cache.albums).length} albums and ${Object.keys(cache.artists).length} artists.`
	)
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
