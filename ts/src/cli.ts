import Path from "path"
import {CssGeneratorParams} from "src/css_generator"
import {FontFormat, FontGeneratorParams, knownFontFormats} from "src/font_generator"
import {CssImportStyle, TsGeneratorParams} from "src/ts_generator"

export interface CliArgs {
	readonly svgDir: string
	readonly font: FontGeneratorParams
	readonly ts: TsGeneratorParams
	readonly css: CssGeneratorParams
}

const defaultTsName = "Icons"
const defaultFontFormatList: FontFormat = "woff2"
const defaultFontFamily = "icons"
const defaultCssClassName = "icon"
const defaultCssImportStyle: CssImportStyle = "default"

function displayHelp(): never {
	const helpStr = `A tool to work with icon fonts.

--svg-dir:              Path to a directory with all the SVG icons. Required.
--font-path:            Path to a resulting font (without extension, like './static/font/my_icon_font'); extension(s) will be added automatically. Required.
--font-formats:         List of font extensions that need to be generated. Available values: ${knownFontFormats.join(", ")}. More than one format is passed as comma-separated string: 'ttf,eot,woff'. Default is '${defaultFontFormatList}'. Case-insensitive.
--font-normalize:       If enabled, heights of the icons will be equalized. False by default.
--css-path:             Path to resulting CSS file. Required.
--css-font-family:      Name of imported font. Default '${defaultFontFamily}'.
--css-font-import-path: String that will be used as an import path of font file(s) in TS file. Default is a relative path between the two. Should omit font extension, as in --font-path.
--css-import-hash:      If enabled, a hash of the font will be appended as query parameter to font import in CSS file. This could help with caching. Default false.
--css-icon-class:       Name of base icon class. Default '${defaultCssClassName}'.
--ts-path:              Path to a resulting Typescript file that will export icons object. Required.
--ts-name:              Name of Typescript exported value. Default is '${defaultTsName}'. Should be proper identifier; not checked.
--ts-css-import-path:   String that will be used as an import path of CSS module in TS file. Default is a relative path between the two.
--ts-css-import-style:  How CSS module import will look like. Possible values: 'default' (default) and 'star'.
--verbose:              Enables some additional logging.
-h, -help, --help:      Display this text and exit.`
	console.error(helpStr)
	process.exit(1)
}

function parseCssImportStyle(value: string): CssImportStyle {
	if(value === "default" || value === "star"){
		return value
	}
	throw new Error("Incorrect CSS import style: " + value)
}

function parseFormatListStr(rawStr: string): FontFormat[] {
	const parts = rawStr.split(",").map(key => key.toLowerCase()) as FontFormat[]
	const result: FontFormat[] = []
	const fontFormatSet = new Set(knownFontFormats)
	for(const part of parts){
		if(fontFormatSet.has(part)){
			result.push(part as FontFormat)
		} else {
			throw new Error(`Unknown font extension: ${part}`)
		}
	}
	return result
}

function resolveRelativeImportPath(a: string, b: string): string {
	let result = Path.relative(Path.dirname(a), b)
	if(Path.sep === "\\"){
		result = result.replace(/\\/g, "/")
	}
	// if import does not start with path part - it is not considered relative, it is considered global
	// but it should be relative, so we explicitly add "./"
	if(!result.startsWith("/") && !result.startsWith(".")){
		result = "./" + result
	}
	return result
}

export function parseCli(): CliArgs {
	let svgDir: string | null = null
	let isVerbose = false

	let fontPath: string | null = null
	let fontFormats = parseFormatListStr(defaultFontFormatList)
	let fontNormalize = false

	let tsPath: string | null = null
	let tsName = defaultTsName
	let tsCssImportPath: string | null = null
	let tsCssImportStyle = defaultCssImportStyle

	let cssPath: string | null = null
	let cssFontFamily = defaultFontFamily
	let cssImportHash = false
	let cssFontImportPath: string | null = null
	let cssClassName = defaultCssClassName

	let i = 2
	function nextArg(): string {
		const result = process.argv[++i]
		if(result === undefined){
			throw new Error(`Expected a value after ${process.argv[i - 1]}`)
		}
		return result
	}

	for(i = 2; i < process.argv.length; i++){
		const arg = process.argv[i]!
		switch(arg){
			case "--svg-dir": svgDir = Path.resolve(nextArg()); break
			case "--font-path": fontPath = Path.resolve(nextArg()); break
			case "--font-formats": fontFormats = parseFormatListStr(nextArg()); break
			case "--font-normalize": fontNormalize = true; break
			case "--ts-path": tsPath = Path.resolve(nextArg()); break
			case "--ts-name": tsName = nextArg(); break
			case "--ts-css-import-path": tsCssImportPath = nextArg(); break
			case "--ts-css-import-style": tsCssImportStyle = parseCssImportStyle(nextArg()); break
			case "--css-path": cssPath = Path.resolve(nextArg()); break
			case "--css-font-family": cssFontFamily = nextArg(); break
			case "--css-import-hash": cssImportHash = true; break
			case "--css-font-import-path": cssFontImportPath = nextArg(); break
			case "--css-class-name": cssClassName = nextArg(); break
			case "--verbose": isVerbose = true; break
			case "-h":
			case "-help":
			case "--help": return displayHelp()
			default: throw new Error("Unknown CLI key: " + arg)
		}
	}

	if(!svgDir){
		throw new Error("No SVG directory path passed.")
	}

	if(!fontPath){
		throw new Error("No font path passed.")
	}

	if(!tsPath){
		throw new Error("No ts path passed.")
	}

	if(!cssPath){
		throw new Error("No css path passed.")
	}

	return {
		svgDir,
		font: {
			formats: fontFormats,
			pathBase: fontPath,
			normalize: fontNormalize,
			isVerbose
		},
		ts: {
			name: tsName,
			path: tsPath,
			cssImportPath: tsCssImportPath ?? resolveRelativeImportPath(tsPath, cssPath),
			cssImportStyle: tsCssImportStyle
		},
		css: {
			path: cssPath,
			fontFamily: cssFontFamily,
			importHash: cssImportHash,
			importPath: cssFontImportPath ?? resolveRelativeImportPath(cssPath, fontPath),
			className: cssClassName
		}
	}
}