import {parseCli} from "src/cli"
import {generateCss} from "src/css_generator"
import {generateFonts} from "src/font_generator"
import {generateTs} from "src/ts_generator"

async function main(): Promise<void> {
	const args = parseCli()
	const fontData = await generateFonts(args.svgDir, args.font)
	await generateCss(args.css, args.font, fontData)
	await generateTs(args.ts, args.css, fontData)
}

async function wrappedMain(): Promise<void> {
	try {
		await main()
	} catch(e){
		console.error(e + "")
		process.exit(1)
	}
}

wrappedMain()