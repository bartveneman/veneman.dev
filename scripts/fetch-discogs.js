import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

const TOKEN = process.env.DISCOGS_TOKEN
if (!TOKEN) {
	console.error('Missing DISCOGS_TOKEN. Copy .env.example to .env and fill in your token.')
	process.exit(1)
}

const API_ROOT = 'https://api.discogs.com'
const USER_AGENT = 'veneman.dev-listens/1.0 +https://veneman.dev'
const UNCATEGORIZED_FOLDER_NAME = 'Uncategorized'
const FEATURED_LIST_NAME = 'Best album artwork'
const COVERS_DIR = new URL('../img/discogs/', import.meta.url)
const COLLECTION_JSON = new URL('../_data/discogs-collection.json', import.meta.url)
const KNOWN_TYPES = ['Album', 'Single', 'EP', 'Compilation', 'Mini-Album']
const RATE_LIMIT_DELAY_MS = 1100

async function discogs_fetch(path) {
	const url = path.startsWith('http') ? path : `${API_ROOT}${path}`
	const res = await fetch(url, {
		headers: {
			Authorization: `Discogs token=${TOKEN}`,
			'User-Agent': USER_AGENT,
		},
	})

	if (!res.ok) {
		throw new Error(`Discogs API error ${res.status} for ${url}: ${await res.text()}`)
	}

	await sleep(RATE_LIMIT_DELAY_MS)
	return res.json()
}

async function get_username() {
	const identity = await discogs_fetch('/oauth/identity')
	return identity.username
}

async function get_uncategorized_folder_id(username) {
	const { folders } = await discogs_fetch(`/users/${username}/collection/folders`)
	const folder = folders.find(
		(f) => f.name.toLowerCase() === UNCATEGORIZED_FOLDER_NAME.toLowerCase()
	)

	if (!folder) {
		throw new Error(`Could not find a "${UNCATEGORIZED_FOLDER_NAME}" folder for user ${username}`)
	}

	return folder.id
}

async function get_collection_releases(username, folder_id) {
	const releases = []
	let page = 1
	let total_pages = 1

	do {
		const data = await discogs_fetch(
			`/users/${username}/collection/folders/${folder_id}/releases?per_page=100&page=${page}`
		)
		releases.push(...data.releases)
		total_pages = data.pagination.pages
		page += 1
	} while (page <= total_pages)

	return releases
}

async function get_featured_release_ids(username) {
	const { lists } = await discogs_fetch(`/users/${username}/lists`)
	const list = lists.find((l) => l.name.toLowerCase() === FEATURED_LIST_NAME.toLowerCase())

	if (!list) {
		console.warn(`Could not find a "${FEATURED_LIST_NAME}" list — no records will be marked featured.`)
		return new Set()
	}

	const { items } = await discogs_fetch(`/lists/${list.id}`)
	return new Set(items.filter((item) => item.type === 'release').map((item) => item.id))
}

function extract_type(formats) {
	const descriptions = formats?.[0]?.descriptions ?? []
	return descriptions.find((d) => KNOWN_TYPES.includes(d)) ?? 'Album'
}

const master_year_cache = new Map()

// The release year (basic_information.year) is the year of this specific
// pressing. The master release's year is the album's original release
// year, which is what listeners usually mean by "what year is this from".
async function get_master_year(master_id) {
	if (!master_id) return null
	if (master_year_cache.has(master_id)) return master_year_cache.get(master_id)

	let year = null
	try {
		const master = await discogs_fetch(`/masters/${master_id}`)
		year = master.year || null
	} catch (err) {
		console.warn(`Could not fetch master ${master_id}: ${err.message}`)
	}

	master_year_cache.set(master_id, year)
	return year
}

async function download_cover(release_id, image_url) {
	const destination = new URL(`${release_id}.jpg`, COVERS_DIR)
	if (existsSync(destination)) return

	const response = await fetch(image_url, {
		headers: { 'User-Agent': USER_AGENT },
	})

	if (!response.ok) {
		console.warn(`Could not download cover for release ${release_id}: ${response.status}`)
		return
	}

	writeFileSync(destination, Buffer.from(await response.arrayBuffer()))
	await sleep(RATE_LIMIT_DELAY_MS)
}

function load_existing_records() {
	if (!existsSync(COLLECTION_JSON)) return new Map()
	const existing = JSON.parse(readFileSync(COLLECTION_JSON, 'utf8'))
	return new Map(existing.map((record) => [record.releaseId, record]))
}

async function main() {
	mkdirSync(COVERS_DIR, { recursive: true })

	const existing_records = load_existing_records()
	console.log(`Loaded ${existing_records.size} cached records from ${COLLECTION_JSON.pathname}`)

	const username = await get_username()
	console.log(`Fetching Discogs collection for ${username}...`)

	const folder_id = await get_uncategorized_folder_id(username)
	const [releases, featured_ids] = await Promise.all([
		get_collection_releases(username, folder_id),
		get_featured_release_ids(username),
	])

	console.log(`Found ${releases.length} releases, ${featured_ids.size} featured.`)

	const records = []
	for (const [index, release] of releases.entries()) {
		const info = release.basic_information
		const release_id = info.id
		const artist = info.artists?.map((a) => a.name).join(', ') ?? 'Unknown artist'

		console.log(`[${index + 1}/${releases.length}] ${artist} - ${info.title}`)

		if (info.cover_image) {
			await download_cover(release_id, info.cover_image)
		}

		const cached = existing_records.get(release_id)
		const original_year =
			cached && cached.originalYear !== undefined
				? cached.originalYear
				: await get_master_year(info.master_id)

		records.push({
			releaseId: release_id,
			artist,
			title: info.title,
			year: info.year || null,
			originalYear: original_year,
			format: info.formats?.[0]?.name ?? 'Unknown',
			type: extract_type(info.formats),
			genres: info.genres ?? [],
			styles: info.styles ?? [],
			cover: `/img/discogs/${release_id}.jpg`,
			discogsUrl: `https://www.discogs.com/release/${release_id}`,
			featured: featured_ids.has(release_id),
			dateAdded: release.date_added,
		})

		writeFileSync(COLLECTION_JSON, JSON.stringify(records, null, '\t') + '\n')
	}

	console.log(`Wrote ${records.length} records to ${COLLECTION_JSON.pathname}`)
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
