import {FontGenerationResult, FontGeneratorParams} from "src/font_generator"
import {promises as Fs} from "fs"

export interface CssGeneratorParams {
	readonly path: string
	readonly fontFamily: string
	readonly importHash: boolean
	readonly importPath: string
	readonly className: string
}

export async function generateCss(params: CssGeneratorParams, fontParams: FontGeneratorParams, fontResult: FontGenerationResult): Promise<void> {
	const css = generateCssContent(params, fontParams, fontResult)
	await Fs.writeFile(params.path, css, "utf-8")
}

function generateCssContent(params: CssGeneratorParams, fontParams: FontGeneratorParams, fontResult: FontGenerationResult): string {
	const list = getListCss(params, fontResult)
	const fontFace = getFontFaceCss(params, fontParams, fontResult)
	const baseClass = getBaseCssClass(params)
	return `
${fontFace}
${baseClass}

${list}
`

}

function getBaseCssClass(params: CssGeneratorParams): string {
	return `
.${params.className}:before {
	font-family: ${JSON.stringify(params.fontFamily)} !important;
	font-style: normal;
	font-weight: normal !important;
	font-variant: normal;
	text-transform: none;
	line-height: 1em;
	width: 1em;
	display: inline-block;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}`
}

function getFontFaceCss(params: CssGeneratorParams, fontParams: FontGeneratorParams, fontResult: FontGenerationResult): string {
	let src = ""
	for(const format of fontParams.formats){
		const url = `${params.importPath}.${format}${params.importHash ? "?h=" + (fontResult.hashes[format] ?? "unknown") : ""}`
		const srcPart = `url(${JSON.stringify(url)}) format(${JSON.stringify(format)})`
		if(src){
			src += ",\n\t"
		}
		src += srcPart
	}

	return `
@font-face {
	font-family: ${JSON.stringify(params.fontFamily)};
	src: ${src};
}`
}

function getListCss(params: CssGeneratorParams, fontResult: FontGenerationResult): string {
	let list = ""
	for(const iconName in fontResult.icons){
		const codePoint = fontResult.icons[iconName]!
		if(list){
			list += "\n"
		}
		list += `.${params.className}.${iconName}:before { content: "\\${codePoint.toString(16)}"; }`
	}
	return list
}