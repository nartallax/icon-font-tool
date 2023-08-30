import SvgToFont, {InfoData} from "svgtofont"
import * as Path from "path"
import * as CreateTempDirectory from "create-temp-directory"
import {promises as Fs} from "fs"
import * as Crypto from "crypto"

export const knownFontFormats = ["woff", "woff2", "ttf", "eot"] as const
export type FontFormat = (typeof knownFontFormats)[number]

/** Icon name, as part of file path -> unicode codepoint */
type FontIconMap = Readonly<Record<string, number>>

export interface FontGenerationResult {
	readonly icons: FontIconMap
	readonly hashes: Readonly<Partial<Record<FontFormat, string>>>
}

export interface FontGeneratorParams {
	readonly pathBase: string
	readonly formats: readonly FontFormat[]
	readonly normalize: boolean
	readonly isVerbose: boolean
}

function processSvgfontInfo(jsonString: string): FontIconMap {
	const info: InfoData = JSON.parse(jsonString)
	const result: Record<string, number> = {}
	for(const iconName in info){
		const iconDef = info[iconName]
		const codepoint = iconDef?.encodedCode
		if(!codepoint){
			throw new Error(`svgfont did not supply codepoint for ${iconName} icon`)
		}
		// I only ever saw codepoint as string
		// but typings say they could be number as well, so let's check for that
		const num = typeof(codepoint) === "number" ? codepoint : parseInt(codepoint.replace(/^\\/, ""), 16)
		result[iconName] = num
	}
	return result
}

// here I mostly rely on svgtofont for gathering the icons
// I could control it a bit more, which will allow me to gather icons from several directories etc
// but right now I don't need this
export async function generateFonts(svgDir: string, params: FontGeneratorParams): Promise<FontGenerationResult> {
	const outDir = await CreateTempDirectory.createTempDirectory()
	let dirFiles: string[]
	let icons: FontIconMap
	const hashes: Partial<Record<FontFormat, string>> = {}

	async function tryMoveFont(format: FontFormat): Promise<void> {
		if(params.formats.indexOf(format) < 0){
			return
		}

		const resultFontPath = params.pathBase + "." + format

		const svgfontPaths = dirFiles.filter(file => Path.extname(file).toLowerCase().replace(/^\./, "") === format)
		if(svgfontPaths.length === 0){
			throw new Error(`svgtofont did not generate ${format} file. Don't know why, investigation is required.`)
		} else if(svgfontPaths.length > 1){
			throw new Error(`svgtofont generated ${svgfontPaths.length} files of ${format} format. Not sure which to pick. Why did this even happen?`)
		}
		const svgfontPath = svgfontPaths[0]!

		await Fs.rename(Path.resolve(outDir.path, svgfontPath), resultFontPath)

		const fileContent = await Fs.readFile(resultFontPath)
		hashes[format] = await getHashOfBytes(fileContent)
	}

	try {
		await SvgToFont({
			src: svgDir,
			dist: outDir.path,
			css: false,
			startUnicode: 0xf101, // https://codepoints.net/private_use_area
			generateInfoData: true,
			svgicons2svgfont: {
				// if goes lower than 1000 - generator starts to complain
				// looks like it's something about quality? more = heavier font files
				fontHeight: 5000,
				normalize: params.normalize,
				log: params.isVerbose ? undefined : () => {/* noop */}
			},
			log: params.isVerbose
		})
		const [_dirFiles, infoJsonStr] = await Promise.all([
			Fs.readdir(outDir.path),
			Fs.readFile(Path.resolve(outDir.path, "info.json"), "utf-8")
		])
		dirFiles = _dirFiles

		try {
			icons = processSvgfontInfo(infoJsonStr)
		} catch(e){
			throw new Error("Failed to process info.json from svginfo: " + e)
		}

		await Promise.all(knownFontFormats.map(format => tryMoveFont(format)))
	} finally {
		await outDir.remove()
	}

	return {icons, hashes}
}

function getHashOfBytes(bytes: Buffer): Promise<string> {
	return new Promise(ok => {
		const hash = Crypto.createHash("sha1")
		hash.setEncoding("hex")
		hash.end(bytes, () => {
			ok(hash.read())
		})
	})
}