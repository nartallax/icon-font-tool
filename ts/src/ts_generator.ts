import {promises as Fs} from "fs"
import {CssGeneratorParams} from "src/css_generator"
import {FontGenerationResult} from "src/font_generator"

export type CssImportStyle = "star" | "default"

export interface TsGeneratorParams {
	readonly path: string
	readonly name: string
	readonly cssImportPath: string
	readonly cssImportStyle: CssImportStyle
}

function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.substring(1).toLowerCase()
}

function toCamelCase(str: string): string {
	let result = str
		.split(/[^a-zA-Z\d]/)
		.flatMap(part => part.split(/(?=[A-Z])/))
		.map((part, i) => i === 0 ? part.toLowerCase() : capitalize(part))
		.join("")

	if(/^\d/.test(result)){
		result = "_" + result
	}
	return result
}

function resolveIdentifierDuplicates(pairs: [string, string][]): void {
	const knownIdentifiers = new Set<string>()
	for(let i = 0; i < pairs.length; i++){
		const [name, identifier] = pairs[i]!
		if(!knownIdentifiers.has(identifier)){
			continue
		}
		let fixedIdentifier: string
		let suffix = 2
		do {
			fixedIdentifier = identifier + "_" + (suffix++)
		} while(knownIdentifiers.has(fixedIdentifier))
		pairs[i] = [name, identifier]
	}
}

function makeIdentifiers(fontResult: FontGenerationResult): [name: string, identifier: string][] {
	const result: [string, string][] = []
	const names = [...Object.keys(fontResult.icons)].sort()
	for(const name of names){
		result.push([name, toCamelCase(name)])
	}
	resolveIdentifierDuplicates(result)
	return result
}

export async function generateTs(params: TsGeneratorParams, cssParams: CssGeneratorParams, fontResult: FontGenerationResult): Promise<void> {
	const generator = /\.module\.[^.]+$/i.test(params.cssImportPath) ? generateObject : generateConstEnum
	const ts = generator(params, cssParams, fontResult)
	await Fs.writeFile(params.path, ts, "utf-8")
}

function generateImport(params: TsGeneratorParams): string {
	let imprt = "import "
	if(params.cssImportStyle === "star"){
		imprt += "* as "
	}
	imprt += `s from ${JSON.stringify(params.cssImportPath)}`
	return imprt
}

function generateObject(params: TsGeneratorParams, cssParams: CssGeneratorParams, fontResult: FontGenerationResult): string {
	return `${generateImport(params)}

const i = s[${JSON.stringify(cssParams.className)}] + " "

const _${params.name} = {
	${makeIdentifiers(fontResult).map(([iconName, identifier]) =>
		`${identifier}: i + s[${JSON.stringify(iconName)}]`
	).join(",\n\t")}
}

type IconMap = Readonly<typeof _${params.name}>
export const ${params.name}: IconMap = _${params.name}`
}

function generateConstEnum(params: TsGeneratorParams, cssParams: CssGeneratorParams, fontResult: FontGenerationResult): string {
	return `${generateImport(params)}

void s // just to make sure it's not optimized away

export const enum ${params.name} {
	${makeIdentifiers(fontResult).map(([iconName, identifier]) =>
		`${identifier} = ${JSON.stringify(cssParams.className + " " + iconName)}`
	).join(",\n\t")}
}`
}